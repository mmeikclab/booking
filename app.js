// Appwrite Başlatma
const { Client, Account, Databases, Query, ID } = Appwrite;
const client = new Client();
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1') // Örn: 'https://cloud.appwrite.io/v1'
    .setProject('6a9c491d0023fea6607e');

const account = new Account(client);
const databases = new Databases(client);

function toggleForms() {
    const type = document.getElementById("userType").value;

    if (type === "ogrenci") {
        document.getElementById("ogrenciForm").classList.remove("hidden");
        document.getElementById("akademikForm").classList.add("hidden");
    } else {
        document.getElementById("ogrenciForm").classList.add("hidden");
        document.getElementById("akademikForm").classList.remove("hidden");
    }
}

async function kayitOl() {
    const userType = document.getElementById("userType").value;

    if (userType === 'ogrenci') {
        const ogrId = document.getElementById("ogrId").value.trim();
        const ad = document.getElementById("ogrAd").value.trim();
        const soyad = document.getElementById("ogrSoyad").value.trim();
        const telefon = document.getElementById("ogrTelefon").value.trim();
        const danismanId = document.getElementById("ogrDanisman").value;
        const sifre = document.getElementById("ogrSifre").value;
        const sifreTekrar = document.getElementById("ogrSifreTekrar").value;
        const kabul = document.getElementById("kabulOnay").checked;

        if (!ogrId || !ad || !soyad || !telefon || !sifre || !sifreTekrar) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        if (sifre !== sifreTekrar) {
            alert("Şifreler birbiriyle uyuşmuyor!");
            return;
        }

        if (!kabul) {
            alert("Lütfen kuralları onaylayın.");
            return;
        }

        const email = `${ogrId}@ogr.ikc.edu.tr`;

        try {
            const response = await account.create(ID.unique(), email, sifre, `${ad} ${soyad}`);
            await account.createEmailPasswordSession(email, sifre);

            // Veritabanı kaydı (Profiller şemasına birebir uyumlu)
            await databases.createDocument(
                '6a9c4942003cfdd06f0f',
                '6a9c49700018c0fef5c8',
                response.$id,
                {
                    isimSoyisim: `${ad} ${soyad}`,
                    rol: "ogrenci",
                    telefon: telefon,
                    danismanId: danismanId,
                    danismanOnayi: false
                }
            );

            alert("Kayıt başarılı! Danışman onayı bekleniyor.");
            window.location.href = "dashboard.html";

        } catch (error) {
            alert("Kayıt sırasında hata oluştu: " + error.message);
        }

    } else {
        // Akademik Personel Kaydı
        const akademikId = document.getElementById("akademikId").value.trim();
        const ad = document.getElementById("akdAd").value.trim();
        const soyad = document.getElementById("akdSoyad").value.trim();
        const sifre = document.getElementById("akdSifre").value;
        const sifreTekrar = document.getElementById("akdSifreTekrar").value;
        const kabul = document.getElementById("kabulOnay").checked;

        if (!akademikId || !ad || !soyad || !sifre || !sifreTekrar) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        if (sifre !== sifreTekrar) {
            alert("Şifreler birbiriyle uyuşmuyor!");
            return;
        }

        if (!kabul) {
            alert("Lütfen kuralları onaylayın.");
            return;
        }

        const email = `${akademikId}@ikcu.edu.tr`;

        try {
            const response = await account.create(ID.unique(), email, sifre, `${ad} ${soyad}`);
            await account.createEmailPasswordSession(email, sifre);

            // Akademik personel için telefon zorunlu olduğu şemaya "Belirtilmemiş" metnini veriyoruz
            await databases.createDocument(
                '6a9c4942003cfdd06f0f',
                '6a9c49700018c0fef5c8',
                response.$id,
                {
                    isimSoyisim: `${ad} ${soyad}`,
                    rol: "akademik",
                    telefon: "Belirtilmemiş",
                    danismanId: "yok",
                    danismanOnayi: true
                }
            );

            alert("Akademik personel kaydınız başarıyla oluşturuldu!");
            window.location.href = "dashboard.html";

        } catch (error) {
            alert("Kayıt sırasında hata oluştu: " + error.message);
        }
    }
}

function formDegistir(hedef) {
    if (hedef === 'kayit') {
        document.getElementById('girisFormu').classList.add('hidden');
        document.getElementById('kayitFormu').classList.remove('hidden');
    } else {
        document.getElementById('kayitFormu').classList.add('hidden');
        document.getElementById('girisFormu').classList.remove('hidden');
    }
}

async function girisYap() {
    const inputId = document.getElementById("loginEmail").value.trim();
    const sifre = document.getElementById("loginPassword").value;

    if (!inputId || !sifre) {
        alert("Lütfen numaranızı/ID bilginizi ve şifrenizi eksiksiz girin.");
        return;
    }

    try {
        // Varsa askıda kalan eski oturumu temizle
        try {
            await account.deleteSession('current');
        } catch (ignoredError) { }

        // Eğer kullanıcı alışkanlıktan dolayı @ yazdıysa direkt kullan
        if (inputId.includes("@")) {
            await account.createEmailPasswordSession(inputId, sifre);
        } else {
            // Sadece ID girildiyse, arka planda sırayla iki mail uzantısını da test et
            try {
                // 1. İhtimal: Önce öğrenci mail uzantısıyla giriş yapmayı dene
                await account.createEmailPasswordSession(`${inputId}@ogr.ikc.edu.tr`, sifre);
            } catch (ilkHata) {
                // 2. İhtimal: Eğer öğrenci değilse akademik personel uzantısıyla dene
                await account.createEmailPasswordSession(`${inputId}@ikcu.edu.tr`, sifre);
            }
        }

        // Başarılı olursa panele yönlendir
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Giriş işlemi başarısız oldu: Lütfen numaranızı/ID'nizi ve şifrenizi kontrol edin.");
    }
}
// Danışman hocaları (Akademik ve Yönetici) veritabanından çekip select içine dolduran fonksiyon
async function danismanlariYukle() {
    const danismanSelect = document.getElementById('ogrDanisman');
    
    // Eğer sayfada danışman seçme menüsü yoksa (örneğin dashboard'daysak) fonksiyonu durdur
    if (!danismanSelect) return; 

    danismanSelect.innerHTML = '<option value="">Hocalar Yükleniyor...</option>';

    try {
        const hocalar = await databases.listDocuments(
            '6a9c4942003cfdd06f0f',
            '6a9c49700018c0fef5c8',
            [
                Query.equal('rol', ['akademik', 'yonetici']) // Hem akademisyenleri hem yöneticileri getir
            ]
        );

        danismanSelect.innerHTML = '<option value="">-- Danışman Hocanızı Seçiniz --</option>';

        hocalar.documents.forEach(hoca => {
            const option = document.createElement('option');
            option.value = hoca.$id; // Veritabanına kaydedilecek asıl ID
            option.text = hoca.isimSoyisim; // Ekranda görünecek isim
            danismanSelect.add(option);
        });

    } catch (error) {
        console.error("Danışmanlar yüklenirken hata:", error);
        danismanSelect.innerHTML = '<option value="">Hocalar yüklenemedi, sayfayı yenileyin.</option>';
    }
}

// Sayfa yüklendiğinde bu fonksiyonu otomatik çalıştır

document.addEventListener('DOMContentLoaded', async () => {
    danismanlariYukle();

    // Sadece index.html (veya kök dizin) sayfasındaysa yönlendir
    try {
        const session = await account.get();
        if (session) {
            const path = window.location.pathname;
            if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
                window.location.href = "dashboard.html";
            }
        }
    } catch (error) {
        // Oturum yoksa veya hata verirse hiçbir şey yapma
    }
}

async function sifreSifirlamaGonder() {
    const inputId = document.getElementById('kurtarmaId').value.trim();
    if (!inputId) {
        alert("Lütfen geçerli bir numara veya ID girin.");
        return;
    }

    // Appwrite'ın mail içindeki butona tıklandığında yönlendireceği sayfa
    const yonlendirmeUrl = window.location.origin + '/sifre-yenile.html';
    let basarili = false;
    const btn = document.querySelector("#sifremiUnuttumFormu .btn-submit");
    btn.innerText = "Gönderiliyor...";
    btn.disabled = true;

    try {
        if (inputId.includes("@")) {
            await account.createRecovery(inputId, yonlendirmeUrl);
        } else {
            try {
                await account.createRecovery(`${inputId}@ogr.ikc.edu.tr`, yonlendirmeUrl);
            } catch (err) {
                await account.createRecovery(`${inputId}@ikcu.edu.tr`, yonlendirmeUrl);
            }
        }
        basarili = true;
    } catch (error) {
        alert("Sıfırlama başarısız. Bu numaraya ait aktif bir hesap bulunamadı veya e-posta atılamıyor.");
    }

    btn.innerText = "Sıfırlama Bağlantısı Gönder";
    btn.disabled = false;

    if (basarili) {
        alert("Şifre sıfırlama e-postası okul mail adresinize gönderildi! (Gereksiz/Spam kutusunu kontrol etmeyi unutmayın)");
        formDegistir('giris');
    }
});
