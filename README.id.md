<p align="center">
  <img src="https://img.shields.io/badge/license-GPL--3.0-545ded" alt="Lisensi">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-80848e" alt="Platform">
  <img src="https://img.shields.io/badge/stack-Python%20%2B%20JS-545ded" alt="Stack">
</p>

---

# Foto Kita Blur

Aplikasi kamera desktop yang mengutamakan privasi. Buramkan feed kamera secara otomatis saat kamu memberi gesture peace (V-sign).

---

> [!CAUTION]
> Aplikasi ini menggunakan kamera secara real-time. Feed video diproses secara lokal dan tidak pernah dikirim ke server mana pun. Tidak ada data yang meninggalkan mesin kamu.

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Blur Otomatis** | Deteksi gesture tangan real-time memicu buram kamera |
| **Privasi Utama** | Kamera mulai dalam mode senyap (LED mati) |
| **Kamera Virtual** | Bekerja dengan Zoom, Google Meet, OBS, Discord, dan aplikasi lain |
| **Deteksi Gesture** | Peace sign (V-sign) mengaktifkan/menonaktifkan blur |
| **Pemrosesan Lokal** | Semua pemrosesan video di mesin kamu — tanpa koneksi jaringan |
| **UI Tanpa Bingkai** | Antarmuka bersih, minimal, tidak mengganggu |
| **Multi Platform** | Bekerja di Windows, macOS, dan Linux |

---

## Cara Pakai

**Langkah 1:** Jalankan `setup.ps1` untuk menginstal dependensi.

**Langkah 2:** Jalankan aplikasi:
```
run.bat
```

**Langkah 3:** Berikan peace sign (V-sign) ke kamera. Efek blur aktif. Berikan lagi untuk menonaktifkan.

---

## Cara Kerja

```
Kamera → MediaPipe Hand Tracking → Deteksi Gesture → Filter Blur → Output Kamera Virtual
```

1. **MediaPipe** mendeteksi landmark tangan di setiap frame pada 60+ FPS
2. Saat peace sign terdeteksi (jari telunjuk + tengah lurus, lainnya menekuk), blur toggle
3. Feed kamera melewati filter blur real-time saat diaktifkan
4. Feed yang sudah diproses dikirim ke perangkat kamera virtual

Seluruh pipeline berjalan lokal. Tidak ada data video yang dikirim melalui jaringan.

---

## Requirements

- Python 3.8+
- Node.js 16+
- Webcam
- Windows, macOS, atau Linux

Untuk pengguna Windows, script `setup.ps1` menangani semua instalasi dependensi secara otomatis.

---

## FAQ

**T: Apakah aplikasi ini mengirim video saya ke mana pun?**
J: Tidak. Semua pemrosesan lokal. Aplikasi tidak membuat koneksi jaringan sama sekali.

**T: Kenapa pakai peace sign?**
J: Gesture yang natural dan disengaja, kecil kemungkinan terjadi secara tidak sengaja.

**T: Bisa dipakai dengan Zoom atau Google Meet?**
J: Ya. Aplikasi menghasilkan perangkat kamera virtual yang muncul sebagai opsi kamera di aplikasi video call.

**T: Gesture tidak terdeteksi?**
J: Pastikan tangan terlihat jelas, pencahayaan cukup, dan menghadap kamera langsung. Peace sign butuh jari telunjuk dan tengah lurus.

**T: Bekerja dengan banyak kamera?**
J: Ya. Kamu bisa memilih kamera yang digunakan di pengaturan aplikasi.

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| `Module not found` | Dependensi belum terinstal | Jalankan `setup.ps1` dulu |
| `Camera not detected` | Tidak ada webcam atau driver | Cek kamera dengan aplikasi lain |
| Blur terasa lambat | FPS rendah | Turunkan resolusi kamera di pengaturan |
| Kamera virtual tidak muncul | Driver belum terpasang | Restart aplikasi video call setelah menjalankan Foto Kita Blur |

---

## Kredit

Dibuat oleh [norvramis](https://github.com/norvramis).

---

## Lisensi

GPL-3.0. Lihat [LICENSE](LICENSE).

<details>
<summary>Teks lisensi lengkap</summary>

```
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007
...
```

</details>

---

**AI Assistance.** Proyek ini dikembangkan dengan bantuan AI (LLM) untuk menyusun kode dan mengotomatiskan proses pengaturan.
