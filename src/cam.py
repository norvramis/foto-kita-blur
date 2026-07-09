import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import datetime
import os
import urllib.request
import time
import pyvirtualcam
import threading
import pystray
from PIL import Image, ImageDraw, ImageFont
import sys
import ctypes
from ctypes import wintypes

if sys.executable.endswith('pythonw.exe'):
    sys.stdout = open(os.devnull, 'w')
    sys.stderr = open(os.devnull, 'w')

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

show_landmarks = True
blur_strength = 35
active_camera = 0
model_path = 'hand_landmarker.task'

is_running = True
camera_active = False
show_preview = False
vcam_device_name = "Webcam Released (OFF)"

if not os.path.exists(model_path):
    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    try:
        urllib.request.urlretrieve(url, model_path)
    except Exception as e:
        raise SystemExit("Error: Model file hand_landmarker.task is required.")

base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=2,
    min_hand_detection_confidence=0.4,
    min_hand_presence_confidence=0.4,
    min_tracking_confidence=0.4
)
detector = vision.HandLandmarker.create_from_options(options)

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (5, 6), (6, 7), (7, 8),
    (9, 10), (10, 11), (11, 12),
    (13, 14), (14, 15), (15, 16),
    (17, 18), (18, 19), (19, 20),
    (0, 5), (5, 9), (9, 13), (13, 17), (0, 17)
]

def get_distance(pt1, pt2):
    return np.linalg.norm(np.array([pt1.x - pt2.x, pt1.y - pt2.y, pt1.z - pt2.z]))

def check_peace_gesture(landmarks):
    wrist = landmarks[0]
    
    d8 = get_distance(landmarks[8], wrist)
    d6 = get_distance(landmarks[6], wrist)
    d5 = get_distance(landmarks[5], wrist)
    
    d12 = get_distance(landmarks[12], wrist)
    d10 = get_distance(landmarks[10], wrist)
    d9 = get_distance(landmarks[9], wrist)
    
    d16 = get_distance(landmarks[16], wrist)
    d14 = get_distance(landmarks[14], wrist)
    d13 = get_distance(landmarks[13], wrist)
    
    d20 = get_distance(landmarks[20], wrist)
    d18 = get_distance(landmarks[18], wrist)
    d17 = get_distance(landmarks[17], wrist)

    is_index_extended = d8 > d6 and d8 > d5
    is_middle_extended = d12 > d10 and d12 > d9
    
    is_ring_folded = d16 < d13 or d16 < d14
    is_pinky_folded = d20 < d17 or d20 < d18
    
    tip_dist = get_distance(landmarks[8], landmarks[12])
    base_dist = get_distance(landmarks[5], landmarks[9])
    is_spread = tip_dist > base_dist * 1.2

    return is_index_extended and is_middle_extended and is_ring_folded and is_pinky_folded and is_spread

def draw_landmarks(frame, landmarks, is_peace, width, height):
    joint_color = (68, 68, 239) if is_peace else (184, 184, 99)
    connection_color = (100, 100, 255) if is_peace else (220, 180, 100)
    
    for start_idx, end_idx in HAND_CONNECTIONS:
        pt1 = landmarks[start_idx]
        pt2 = landmarks[end_idx]
        x1, y1 = int(pt1.x * width), int(pt1.y * height)
        x2, y2 = int(pt2.x * width), int(pt2.y * height)
        
        x1, y1 = max(0, min(width-1, x1)), max(0, min(height-1, y1))
        x2, y2 = max(0, min(width-1, x2)), max(0, min(height-1, y2))
        cv2.line(frame, (x1, y1), (x2, y2), connection_color, 2, cv2.LINE_AA)
        
    for idx, pt in enumerate(landmarks):
        x, y = int(pt.x * width), int(pt.y * height)
        x, y = max(0, min(width-1, x)), max(0, min(height-1, y))
        radius = 5 if idx not in [8, 12] else 7
        cv2.circle(frame, (x, y), radius, joint_color, -1, cv2.LINE_AA)
        cv2.circle(frame, (x, y), 2, (255, 255, 255), -1, cv2.LINE_AA)

def draw_hud(frame, is_peace, width, height, has_vcam):
    overlay = frame.copy()
    vcam_status = "VCam: ACTIVE" if has_vcam else "VCam: LOCAL ONLY"
    
    if is_peace:
        cv2.rectangle(overlay, (0, 0), (width, 50), (30, 30, 220), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        cv2.rectangle(frame, (0, 0), (width-1, height-1), (50, 50, 230), 8)
        cv2.putText(frame, f"PEACE DETECTED - BLURRING ACTIVE ({vcam_status})", (20, 32), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
    else:
        cv2.rectangle(overlay, (0, 0), (width, 50), (35, 30, 25), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        cv2.putText(frame, f"Cam - Ready ({vcam_status})", (20, 32), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (240, 240, 240), 2, cv2.LINE_AA)

def is_startup_enabled():
    startup_dir = os.path.join(os.getenv('APPDATA'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    shortcut_path = os.path.join(startup_dir, "Cam.bat")
    return os.path.exists(shortcut_path)

def toggle_startup(enable=True):
    startup_dir = os.path.join(os.getenv('APPDATA'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    shortcut_path = os.path.join(startup_dir, "Cam.bat")
    if enable:
        proj_dir = os.path.dirname(os.path.abspath(__file__))
        bat_path = os.path.join(proj_dir, "run.bat")
        with open(shortcut_path, 'w') as f:
            f.write(f'@echo off\nstart "" "{bat_path}"\n')
    else:
        if os.path.exists(shortcut_path):
            os.remove(shortcut_path)

def create_single_instance_mutex():
    mutex_name = "Global\\Cam_SingleInstance_Mutex_Unique_1298371"
    kernel32 = ctypes.windll.kernel32
    kernel32.SetLastError(0)
    handle = kernel32.CreateMutexW(None, 1, mutex_name)
    if kernel32.GetLastError() == 183:
        if handle:
            kernel32.CloseHandle(handle)
        sys.exit(0)
    return handle

def on_control_window_click(event, x, y, flags, param):
    global camera_active, is_running
    hwnd = ctypes.windll.user32.FindWindowW(None, "Cam")
    
    if event == cv2.EVENT_LBUTTONDOWN:
        if 30 <= y <= 60 and 210 <= x <= 270:
            camera_active = not camera_active
        elif 27 <= y <= 63 and 292 <= x <= 328:
            is_running = False
        else:
            if hwnd:
                ctypes.windll.user32.ReleaseCapture()
                ctypes.windll.user32.SendMessageW(hwnd, 0x00A1, 2, 0)

def draw_control_panel():
    img = Image.new('RGBA', (360, 90), color=(26, 20, 24, 255))
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 20)
        font_status = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 14)
        font_x = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 16)
    except IOError:
        font_title = ImageFont.load_default()
        font_status = ImageFont.load_default()
        font_x = ImageFont.load_default()
        
    if camera_active:
        draw.ellipse([22, 19, 70, 67], fill=(16, 185, 129, 30), outline=(16, 185, 129, 255), width=2)
        draw.ellipse([38, 35, 54, 51], fill=(16, 185, 129, 255))
    else:
        draw.ellipse([22, 19, 70, 67], fill=(80, 80, 80, 30), outline=(120, 120, 120, 255), width=2)
        draw.ellipse([38, 35, 54, 51], fill=(120, 120, 120, 255))
        
    draw.text((90, 18), "Cam", font=font_title, fill=(255, 255, 255, 255))
    if camera_active:
        draw.text((90, 52), "Active", font=font_status, fill=(16, 185, 129, 255))
    else:
        draw.text((90, 52), "Off", font=font_status, fill=(156, 163, 175, 255))
        
    if camera_active:
        draw.rounded_rectangle([210, 30, 270, 60], radius=15, fill=(16, 185, 129, 255))
        draw.ellipse([243, 33, 267, 57], fill=(255, 255, 255, 255))
    else:
        draw.rounded_rectangle([210, 30, 270, 60], radius=15, fill=(64, 60, 56, 255))
        draw.ellipse([213, 33, 237, 57], fill=(200, 200, 200, 255))
        
    draw.ellipse([292, 27, 328, 63], fill=(239, 68, 68, 255))
    draw.text((304, 32), "x", font=font_x, fill=(255, 255, 255, 255))
    
    bgr_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGR)
    return bgr_img

def make_window_borderless():
    hwnd = ctypes.windll.user32.FindWindowW(None, "Cam")
    if hwnd:
        style = ctypes.windll.user32.GetWindowLongW(hwnd, -16)
        style &= ~0x00C00000
        style &= ~0x00040000
        ctypes.windll.user32.SetWindowLongW(hwnd, -16, style)
        ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0020 | 0x0002 | 0x0001)

def make_window_rounded():
    hwnd = ctypes.windll.user32.FindWindowW(None, "Cam")
    if hwnd:
        rgn = ctypes.windll.gdi32.CreateRoundRectRgn(0, 0, 360, 90, 45, 45)
        ctypes.windll.user32.SetWindowRgn(hwnd, rgn, True)

def force_arrow_cursor():
    hwnd = ctypes.windll.user32.FindWindowW(None, "Cam")
    if hwnd:
        user32 = ctypes.windll.user32
        h_cursor = user32.LoadCursorW(None, 32512)
        try:
            user32.SetClassLongPtrW(hwnd, -12, h_cursor)
        except AttributeError:
            user32.SetClassLongW(hwnd, -12, h_cursor)

class BufferlessVideoCapture:
    def __init__(self, camera_id):
        self.cap = cv2.VideoCapture(camera_id)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not self.cap.isOpened():
            self.cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.latest_frame = None
        self.ret = False
        self.running = True
        
        if self.cap.isOpened():
            self.ret, self.latest_frame = self.cap.read()
            self.t = threading.Thread(target=self._reader)
            self.t.daemon = True
            self.t.start()

    def _reader(self):
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                self.latest_frame = frame
                self.ret = True
            else:
                time.sleep(0.01)

    def read(self):
        return self.ret, self.latest_frame

    def isOpened(self):
        return self.cap.isOpened()

    def release(self):
        self.running = False
        time.sleep(0.05)
        self.cap.release()

def camera_stream_loop():
    global is_running, show_landmarks, blur_strength, camera_active, show_preview, vcam_device_name
    
    cap = None
    vcam = None
    window_opened = False
    window_name = "Cam Preview"
    control_window_name = "Cam"
    
    cv2.namedWindow(control_window_name, cv2.WINDOW_AUTOSIZE | cv2.WINDOW_GUI_NORMAL)
    cv2.setMouseCallback(control_window_name, on_control_window_click)
    
    window_initialized = False
    peace_filter_score = 0
    max_filter_score = 2

    while is_running:
        control_panel_img = draw_control_panel()
        cv2.imshow(control_window_name, control_panel_img)
        cv2.waitKey(20)
        
        if not window_initialized:
            make_window_borderless()
            make_window_rounded()
            force_arrow_cursor()
            window_initialized = True

        if not camera_active:
            if cap is not None:
                cap.release()
                cap = None
            if vcam is not None:
                vcam.close()
                vcam = None
            if window_opened:
                try:
                    cv2.destroyWindow(window_name)
                    window_opened = False
                except: pass
            vcam_device_name = "Webcam Released (OFF)"
            time.sleep(0.02)
            continue

        if cap is None:
            vcam_device_name = "Initializing..."
            cap = BufferlessVideoCapture(active_camera)
            if not cap.isOpened():
                cap = BufferlessVideoCapture(1)
                if not cap.isOpened():
                    vcam_device_name = "No Camera Found!"
                    cap = None
                    time.sleep(1.0)
                    continue

            ret, frame = cap.read()
            if ret and frame is not None:
                height, width, _ = frame.shape
                try:
                    vcam = pyvirtualcam.Camera(width=width, height=height, fps=30, backend='obs')
                    vcam_device_name = f"Connected ({vcam.device})"
                except Exception:
                    vcam_device_name = "Driver Error (OBS missing?)"
                    vcam = None
            else:
                cap.release()
                cap = None
                time.sleep(1.0)
                continue

        ret, frame = cap.read()
        if not ret or frame is None:
            time.sleep(0.01)
            continue
            
        height, width, _ = frame.shape

        small_frame = cv2.resize(frame, (320, 240))
        rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        timestamp_ms = int(time.time() * 1000)
        results = detector.detect_for_video(mp_image, timestamp_ms)
        
        peace_detected_in_frame = False
        if results.hand_landmarks:
            for hand_landmarks in results.hand_landmarks:
                if check_peace_gesture(hand_landmarks):
                    peace_detected_in_frame = True
                    break
        
        if peace_detected_in_frame:
            peace_filter_score = min(max_filter_score, peace_filter_score + 1)
        else:
            peace_filter_score = max(0, peace_filter_score - 1)
            
        is_peace_active = (peace_filter_score > 0)
        
        if is_peace_active:
            ksize = max(3, blur_strength if blur_strength % 2 == 1 else blur_strength + 1)
            frame = cv2.GaussianBlur(frame, (ksize, ksize), 0)

        if vcam is not None:
            vcam_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            vcam.send(vcam_frame)
            vcam.sleep_until_next_frame()

        if show_preview:
            preview_frame = frame.copy()
            if show_landmarks and results.hand_landmarks:
                for hand_landmarks in results.hand_landmarks:
                    draw_landmarks(preview_frame, hand_landmarks, is_peace_active, width, height)
            
            draw_hud(preview_frame, is_peace_active, width, height, has_vcam=(vcam is not None))
            preview_frame = cv2.flip(preview_frame, 1)
            cv2.imshow(window_name, preview_frame)
            window_opened = True
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                show_preview = False
            elif key == ord('l'):
                show_landmarks = not show_landmarks
        else:
            if window_opened:
                try:
                    cv2.destroyWindow(window_name)
                    window_opened = False
                except: pass
                
        time.sleep(0.01)

    if cap is not None:
        cap.release()
    try: cv2.destroyAllWindows()
    except: pass
    detector.close()
    if vcam is not None:
        vcam.close()

def create_tray_icon():
    img = Image.new('RGB', (64, 64), color=(25, 22, 30))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, 56, 56), fill=(99, 102, 241))
    d.ellipse((22, 22, 42, 42), fill=(20, 184, 166))
    return img

def toggle_preview_item(icon, item):
    global show_preview
    show_preview = not show_preview

def toggle_camera_item(icon, item):
    global camera_active
    camera_active = not camera_active

def toggle_startup_item(icon, item):
    enabled = is_startup_enabled()
    toggle_startup(not enabled)

def exit_app(icon, item):
    global is_running
    is_running = False
    icon.stop()

def get_menu():
    return pystray.Menu(
        pystray.MenuItem("Cam Active Background Monitor", lambda: None, enabled=False),
        pystray.MenuItem(lambda _: f"Status: {vcam_device_name}", lambda: None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Enable Camera Tracking", toggle_camera_item, checked=lambda item: camera_active),
        pystray.MenuItem("Show Preview Window", toggle_preview_item, checked=lambda item: show_preview),
        pystray.MenuItem("Run on Windows Startup", toggle_startup_item, checked=lambda item: is_startup_enabled()),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit Program", exit_app)
    )

def main():
    mutex_handle = create_single_instance_mutex()
    
    icon = pystray.Icon("Foto Kita Blur", create_tray_icon(), menu=get_menu())
    t_tray = threading.Thread(target=icon.run)
    t_tray.daemon = True
    t_tray.start()
    
    camera_stream_loop()
    
    icon.stop()
    ctypes.windll.kernel32.CloseHandle(mutex_handle)

if __name__ == "__main__":
    main()
