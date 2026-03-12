# D&D: Bali Deluge - Perjalanan ke Bedugul

Dokumentasi Game

---

## Gambaran Umum

D&D: Bali Deluge adalah game RPG survival berbasis mekanik Dungeons & Dragons dengan setting pulau Bali, Indonesia. Game ini mengintegrasikan autentikasi ZITADEL dan mengharuskan pemain login sebelum bermain. Game berjalan sepenuhnya di web browser dan merupakan bagian dari ekosistem Personal Knowledge Container.

Platform: Web Browser menggunakan HTML5 Canvas
Autentikasi: ZITADEL dengan OAuth 2.0 dan PKCE
Pemain: 1 pemain (single player dengan AI DM)
Ukuran Peta: Peta Bali lengkap dengan lokasi nyata
Teknologi: JavaScript dan HTML5 Canvas
Deployment: https://pkc.pub

---

## Konsep Game

Skenario Banjir Bali

Air laut naik secara bertahap dan dalam 300 hari seluruh pulau Bali akan terendam kecuali daerah pegunungan tinggi seperti Bedugul dan Kintamani. Pemain harus bertahan hidup dengan dua pilihan strategi utama.

Strategi pertama adalah mencapai Bedugul sebelum air naik terlalu tinggi. Bedugul berada di ketinggian 1240 meter di atas permukaan laut sehingga aman dari banjir. Perjalanan dari Denpasar ke Bedugul memerlukan waktu dan sumber daya yang cukup.

Strategi kedua adalah membangun kapal yang sangat kuat untuk bertahan di laut. Ini memerlukan teknologi tinggi, banyak sumber daya, dan waktu konstruksi yang lama.

Setting Geografis

Game menggunakan peta Bali yang akurat dengan lokasi-lokasi nyata termasuk Denpasar di ketinggian 5 meter, Sanur di 3 meter, Ubud di 200 meter, Kintamani di 1500 meter, Bedugul di 1240 meter, Singaraja di 10 meter, Lovina di 5 meter, Amed di 8 meter, Candidasa di 12 meter, dan Padang Bai di 15 meter.

Setiap lokasi memiliki karakteristik unik. Lokasi pantai akan terendam lebih dulu, lokasi pegunungan aman lebih lama, dan setiap area menawarkan sumber daya berbeda.

---

## Fitur Game

Sistem Lima Stat

Game menggunakan sistem Five Dining Philosophers yang menggantikan stat D&D tradisional.

Energy (ENE) mengontrol stamina fisik, daya tahan, dan kemampuan mengumpulkan sumber daya. Stat ini mempengaruhi aksi seperti mengangkat beban berat, bekerja lama tanpa istirahat, dan bertahan dalam kondisi sulit.

Communication (COM) mengatur kemampuan bernegosiasi, merekrut survivor lain, dan koordinasi tim. Dengan COM tinggi pemain bisa membujuk NPC, mendapat informasi penting, dan membangun aliansi.

Knowledge (KNO) menentukan kemampuan riset, analisis situasi, dan pemecahan masalah. Stat ini penting untuk menemukan rute aman, mengidentifikasi sumber daya, dan memahami pola banjir.

Time (TIM) mempengaruhi kecepatan aksi, perencanaan efisien, dan kesadaran temporal. TIM tinggi membuat pemain bisa menyelesaikan tugas lebih cepat dan merencanakan dengan lebih baik.

Technology (TEC) mengontrol kemampuan membangun peralatan, memperbaiki mesin, dan inovasi. Ini adalah stat terpenting untuk membangun kapal atau peralatan survival canggih.

Mekanik Gameplay

Sistem dice rolling menggunakan d20 standar D&D. Setiap aksi memerlukan roll d20 ditambah modifier stat yang relevan dibandingkan dengan Difficulty Class (DC). Jika total sama atau lebih besar dari DC maka aksi berhasil.

Auto-success rule berlaku ketika base stat pemain sudah melebihi DC. Misalnya jika TEC pemain 16 dan DC untuk repair radio adalah 12, pemain otomatis berhasil tanpa perlu roll.

Setiap aksi menghabiskan waktu. Eksplorasi memakan 0.5 hari, mengumpulkan sumber daya 1 hari, membangun peralatan 3-10 hari, perjalanan antar kota 1-5 hari, dan istirahat 1 hari.

Sistem Inventori dan Equipment

Pemain bisa menemukan atau membangun berbagai item. Makanan kaleng, air bersih, toolkit, radio, peta, kayu, logam, plastik, dan kain adalah item dasar.

Equipment canggih memberikan bonus stat permanen. Solar panel menambah +2 TEC, water filter +2 ENE, communication tower +2 COM, library archive +2 KNO, dan chronometer network +2 TIM.

Countdown 300 Hari

Air naik secara bertahap mengikuti formula linear. Pada hari 1 air di 0 meter, hari 100 air di 500 meter, hari 200 air di 1000 meter, dan hari 300 air di 1500 meter.

Milestone penting terjadi di hari 50 ketika Denpasar dan Sanur mulai terendam, hari 100 semua pantai terendam, hari 150 hanya Ubud dan pegunungan yang aman, hari 200 tekanan waktu maksimal, dan hari 300 game berakhir.

Peta Interaktif

Peta Bali digambar dengan Canvas HTML5. Pemain bisa klik lokasi untuk travel, hover untuk melihat info ketinggian dan status, dan melihat visualisasi air naik secara real-time.

Lokasi yang sudah terendam ditampilkan dengan warna abu-abu. Lokasi aman berwarna hijau dan lokasi berbahaya berwarna merah. Posisi pemain saat ini ditandai dengan lingkaran emas.

---

## Cara Bermain

Mengakses Game

Ada dua cara mengakses game. Pertama melalui PKC landing page di https://pkc.pub/app.html. Klik Apps di sidebar, pilih D&D: Bali Deluge, lalu klik tombol untuk membuka game. Window baru akan terbuka.

Cara kedua adalah akses langsung ke https://pkc.pub/public/examples/games/dnd-bali-auth.html. Layar login akan muncul langsung.

Login

Klik tombol Login dengan ZITADEL. Anda akan diarahkan ke halaman login ZITADEL. Pilih metode login, masukkan username dan password ZITADEL, atau klik Sign in with Google jika tersedia. Setelah login berhasil, Anda akan kembali ke game dan profil Anda muncul di header.

Membuat Karakter

Setelah login, modal pembuatan karakter akan muncul. Masukkan nama karakter Anda. Distribusikan 20 poin stat ke lima kategori (ENE, COM, KNO, TIM, TEC). Setiap stat dimulai dari 10, minimum 8, maksimum 18.

Contoh distribusi untuk karakter Engineer: ENE 12, COM 10, KNO 16, TIM 14, TEC 18. Untuk karakter Leader: ENE 12, COM 18, KNO 14, TIM 16, TEC 10. Untuk karakter Balanced: semua stat di 14.

Klik Mulai Petualangan untuk memulai game. Karakter Anda akan spawn di Denpasar pada hari ke-1.

Aksi-Aksi dalam Game

Jelajahi Area memerlukan roll KNO vs DC 12. Jika berhasil Anda menemukan item seperti makanan, air, toolkit, atau peta. Aksi ini memakan waktu 0.5 hari.

Kumpulkan Sumber Daya memerlukan roll ENE vs DC 10. Jika berhasil Anda mendapat kayu, logam, plastik, atau kain. Aksi ini memakan 1 hari.

Bangun Peralatan memerlukan roll TEC vs DC 15. Jika berhasil Anda membangun equipment yang memberi bonus stat permanen. Aksi ini memakan 3 hari.

Perjalanan ke Utara otomatis membawa Anda ke lokasi berikutnya di jalur Denpasar - Ubud - Kintamani - Bedugul. Waktu perjalanan tergantung jarak.

Istirahat memulihkan stamina dan menghabiskan 1 hari. Tidak ada roll diperlukan.

Bangun Kapal adalah aksi ultimate yang memerlukan roll TEC vs DC 25. Jika berhasil Anda menang dengan membangun kapal super kuat. Aksi ini memakan 10 hari.

Menggunakan Dice Roller

Klik tombol Roll d20 untuk melempar dadu. Hasil akan muncul sebagai angka 1-20. Roll 20 adalah critical success, roll 1 adalah critical failure.

Setelah roll, pilih aksi yang ingin dilakukan. Game akan otomatis menghitung total (roll + modifier) dan membandingkan dengan DC. Hasil ditampilkan di log narasi.

Travel dan Navigasi

Klik lokasi di peta untuk travel ke sana. Jarak akan dihitung otomatis dan waktu perjalanan dikurangi dari countdown. Lokasi yang terendam tidak bisa dikunjungi.

Rute optimal dari Denpasar ke Bedugul adalah Denpasar - Ubud (1 hari) - Kintamani (2 hari) - Bedugul (1 hari). Total 4 hari perjalanan.

---

## Aturan Game

Kondisi Menang

Ada dua cara menang. Pertama mencapai Bedugul sebelum hari ke-300 dan sebelum ketinggian Bedugul (1240m) terendam. Kedua berhasil membangun kapal dengan roll TEC vs DC 25.

Kondisi Kalah

Pemain kalah jika hari ke-300 tiba dan pemain berada di lokasi yang sudah terendam air. Atau jika pemain kehabisan sumber daya vital dan tidak bisa melanjutkan.

Difficulty Classes

DC 5 untuk tugas trivial seperti membuka pintu. DC 10 untuk tugas mudah seperti repair alat sederhana. DC 12 untuk tugas moderate seperti eksplorasi. DC 15 untuk tugas sulit seperti bangun equipment. DC 20 untuk tugas sangat sulit seperti hack sistem. DC 25 untuk tugas hampir mustahil seperti bangun kapal.

Modifier Stat

Modifier dihitung dengan formula (Stat - 10) dibagi 2 dibulatkan ke bawah. Contoh: Stat 18 = +4 modifier, Stat 16 = +3, Stat 14 = +2, Stat 12 = +1, Stat 10 = 0, Stat 8 = -1.

Manajemen Waktu

Setiap aksi menghabiskan waktu. Pemain harus balance antara eksplorasi, gathering, building, dan travel. Terlalu lama di satu tempat bisa membuat lokasi terendam sebelum sempat escape.

Strategi optimal adalah gather resources di Denpasar (hari 1-20), travel ke Ubud (hari 21), build equipment di Ubud (hari 22-40), travel ke Kintamani (hari 41-42), final preparation (hari 43-50), travel ke Bedugul (hari 51).

---

## Status Saat Ini dan Rencana Masa Depan

Yang Sudah Berfungsi

Versi saat ini sudah termasuk autentikasi ZITADEL, integrasi profil user, single player dengan mekanik D&D, peta Bali interaktif dengan 10 lokasi, sistem 5 stat (ENE, COM, KNO, TIM, TEC), dice roller d20, sistem inventori dan equipment, countdown 300 hari dengan visualisasi air naik, multiple win conditions, dan log narasi perjalanan.

Fitur yang Direncanakan

Versi mendatang akan menambahkan AI Dungeon Master untuk narasi dinamis, NPC dan encounter random, sistem quest dan side missions, multiplayer co-op mode, lebih banyak lokasi di Bali, sistem crafting yang lebih kompleks, visual upgrade untuk peta, sound effects dan background music, achievement system, dan save/load game functionality.

---

## Panduan Cepat

Untuk memulai, akses game di https://pkc.pub/app.html. Klik Apps di sidebar lalu pilih D&D: Bali Deluge. Klik tombol untuk membuka game. Login dengan ZITADEL atau Google. Buat karakter dengan distribusi stat sesuai strategi. Roll d20 sebelum setiap aksi. Pilih aksi yang sesuai dengan situasi. Perhatikan countdown dan ketinggian air. Travel ke utara sebelum lokasi terendam. Capai Bedugul atau bangun kapal untuk menang.

Tips Strategi

Fokus TEC jika ingin build kapal. Fokus TIM untuk travel cepat. Fokus KNO untuk eksplorasi efisien. Jangan terlalu lama di Denpasar karena akan cepat terendam. Kumpulkan resources sebanyak mungkin sebelum travel. Build equipment untuk boost stats sebelum aksi sulit. Monitor water level dan plan route dengan hati-hati.

---

## Latar Belakang Filosofis

Game ini didasarkan pada konsep Prologue of Spacetime dan Five Dining Philosophers. Setiap stat mewakili salah satu dari Lima Dewa: God of Energy, God of Communication, God of Knowledge, God of Time, dan God of Technology.

Tema utama adalah survival dalam menghadapi bencana yang tidak terhindarkan, manajemen sumber daya terbatas, pentingnya perencanaan dan foresight, balance antara aksi dan refleksi, dan makna dari pilihan dalam kondisi ekstrem.

Game ini bukan hanya entertainment tetapi juga alat pembelajaran untuk systems thinking, resource management, risk assessment, dan decision making under pressure.

---

## Troubleshooting

Masalah Autentikasi

Jika Firefox menampilkan pesan tidak bisa membuka halaman atau menyebut X-Frame-Options, ini karena halaman login ZITADEL tidak bisa ditampilkan dalam iframe. Game membuka di window baru yang merupakan behavior yang diharapkan.

Ketika muncul error invalid redirect URI, berarti ada mismatch antara konfigurasi di ZITADEL dan yang digunakan game. Verifikasi URI di ZITADEL cocok persis, cek typo, trailing slash, dan protokol http vs https.

Error client not found berarti Client ID salah. Cek Client ID di zitadel-config.js dan pastikan cocok dengan ZITADEL Console.

Jika Google Sign-In tidak bekerja, identity provider Google belum dikonfigurasi di ZITADEL. Ikuti panduan di docs/GOOGLE_OAUTH_SETUP_GUIDE.md atau gunakan login ZITADEL native.

Masalah Game

Jika game tidak load setelah login, biasanya masalah browser cache atau session. Coba clear browser cache, hard refresh dengan Cmd+Shift+R di Mac atau Ctrl+Shift+F5 di Windows, atau buka game di incognito/private mode.

Jika dice tidak bisa di-roll, pastikan Anda sudah klik tombol Roll d20. Hasil roll akan muncul di panel dice roller.

Jika tidak bisa travel ke lokasi, kemungkinan lokasi sudah terendam air. Cek ketinggian lokasi vs water level saat ini. Hanya bisa travel ke lokasi yang masih di atas air.

Jika aksi selalu gagal, stat Anda mungkin terlalu rendah untuk DC yang diperlukan. Build equipment untuk boost stats atau tunggu roll yang lebih tinggi.

---

## Referensi Teknis

File Game

Game utama: public/examples/games/dnd-bali.html
Authentication wrapper: public/examples/games/dnd-bali-auth.html
Konfigurasi: public/config/zitadel-config.js
Auth library: public/js/auth/zitadel-auth.js

Konfigurasi ZITADEL

Application type: User Agent dengan PKCE
Client ID: 363313097403859529@landingpage
Redirect URIs: Dikonfigurasi untuk local dan production
Scopes: openid profile email

Deployment

Local: http://localhost:3000/public/examples/games/dnd-bali-auth.html
Production: https://pkc.pub/public/examples/games/dnd-bali-auth.html

---

Versi 1.0.0 - Single Player Survival RPG
Terakhir Diupdate 11 Maret 2026
Dimaintain oleh PKC Development Team
