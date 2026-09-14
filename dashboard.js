// Not: Client, account ve databases nesneleri app.js üzerinden global olarak gelmektedir.

let aktifKullanici = null;
let adminModuAcik = false;
// Çoklu seçim için kullanılacak geçici dizi
let seciliRandevular = [];
// Sayfa yüklendiğinde oturumu kontrol et
window.onload = async function() {
    const bugun = new Date();
    bugun.setDate(bugun.getDate() + 1); // Bugünü seçemez, en erken yarın seçilebilir
    const minTarih = bugun.toISOString().split('T')[0];
    document.getElementById('tarihSecim').setAttribute('min', minTarih);

    try {
        const session = await account.get(); // Aktif oturumu getir
        await kullaniciBilgileriniGetir(session.$id);
        await lablariGetir(); 
    } catch (error) {
        window.location.href = "index.html"; 
    }
};

async function kullaniciBilgileriniGetir(userId) {
    try {
        const profil = await databases.getDocument(
            '6a9c4942003cfdd06f0f', 
            '6a9c49700018c0fef5c8', 
            userId
        );
        
        aktifKullanici = profil;
        document.getElementById('karsilamaMesaji').innerText = `Hoş geldin, ${profil.isimSoyisim}`;
        
        arayuzuHazirla(profil);

    } catch (error) {
        console.error("Profil bilgileri çekilemedi:", error);
    }
}

function arayuzuHazirla(profil) {
    const rol = profil.rol; 
    
    // Önce tüm butonları gizleyelim
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.add('hidden'));

    if (rol === 'ogrenci') {
        // --- Ceza Kontrolü ve Uyarı Gösterimi ---
        const bugunStr = new Date().toISOString().split('T')[0];
        const cezaKutusu = document.getElementById('cezaUyarisi');
        const cezaMetni = document.getElementById('cezaMetniAlani');

        if (profil.cezaAsamasi > 0 && profil.cezaTarihi) {
            // Tarihin sadece YYYY-MM-DD kısmını alıyoruz (T ve sonrasını atıyoruz)
            const sadeTarih = profil.cezaTarihi.split('T')[0];
            
            if (sadeTarih >= bugunStr) {
                if (cezaKutusu) {
                    cezaKutusu.classList.remove('hidden');
                    cezaMetni.innerText = `${profil.cezaAsamasi}. kademe devamsızlık nedeniyle ${sadeTarih} tarihine kadar (bu tarih dahil) laboratuvar randevusu almanız engellenmiştir. Daha fazla bilgi için danışman veya laboratuvar sorumlusu ile iletişime geçiniz.`;
                }
            } else {
                if (cezaKutusu) cezaKutusu.classList.add('hidden');
            }
        } else {
            if (cezaKutusu) cezaKutusu.classList.add('hidden');
        }
        // ---------------------------------------------

        // Onay Kontrolü
        if (profil.danismanOnayi === false) {
            document.getElementById('onayUyarisi').classList.remove('hidden');
        } else {
            document.getElementById('btnRandevuAlma').classList.remove('hidden');
            document.getElementById('btnRandevularim').classList.remove('hidden');
            sekmeAc('randevuAlma');
        }
    }
    else if (rol === 'akademik') {
        document.getElementById('btnRandevuAlma').classList.remove('hidden');
        document.getElementById('btnRandevularim').classList.remove('hidden');
        document.getElementById('btnOgrencilerim').classList.remove('hidden');
        document.getElementById('btnOgrenciRandevulari').classList.remove('hidden');
        sekmeAc('randevuAlma');
    }
    // ... (öğrenci ve akademik kısımları aynı kalacak)
    else if (rol === 'yonetici') {
        document.getElementById('btnRandevuAlma').classList.remove('hidden');
        document.getElementById('btnRandevularim').classList.remove('hidden');
        document.getElementById('btnOgrencilerim').classList.remove('hidden');
        document.getElementById('btnOgrenciRandevulari').classList.remove('hidden');
        
        // Sadece geçiş butonunu görünür yapıyoruz, sol menüdeki admin butonları gizli kalıyor
        const toggleBtn = document.getElementById('btnAdminToggle');
        if (toggleBtn) toggleBtn.classList.remove('hidden');

        sekmeAc('randevuAlma');
    }
}

// Sekmeler arası geçiş fonksiyonu
function sekmeAc(sekmeId) {
    const sekmeler = document.querySelectorAll('.tab-content');
    sekmeler.forEach(sekme => sekme.classList.remove('active-tab'));
    
    const hedefSekme = document.getElementById(sekmeId);
    if (hedefSekme) {
        hedefSekme.classList.add('active-tab');
    }
}

async function cikisYap() {
    try {
        await account.deleteSession('current');
        window.location.href = "index.html";
    } catch (error) {
        console.error("Çıkış yapılamadı:", error);
    }
}

// Sayfa açıldığında laboratuvar listesini Appwrite'tan çekip menüye ekleyen fonksiyon
async function lablariGetir() {
    try {
        const labs = await databases.listDocuments(
            '6a9c4942003cfdd06f0f', 
            '6a9c4a670034731ee85e'
        );
        
        const labSecimMenu = document.getElementById('labSecim');
        if (!labSecimMenu) return;
        
        labs.documents.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.$id;
            option.text = lab.labIsmi;
            labSecimMenu.add(option);
        });

    } catch (error) {
        console.error("Laboratuvarlar çekilirken hata oluştu: ", error);
    }
}

// Tarih ve Lab seçildiğinde çalışacak olan ana fonksiyon
async function matrisiGuncelle() {
    seciliRandevular = []; 
    
    const secilenLabId = document.getElementById('labSecim').value;
    const secilenTarih = document.getElementById('tarihSecim').value;
    const matrisAlani = document.getElementById('matrisAlani');

    if (!secilenLabId || !secilenTarih) {
        matrisAlani.innerHTML = "<p style='color: #7f8c8d; text-align: center;'>Lütfen laboratuvar ve tarih seçiniz.</p>";
        return;
    }

    const tarihKontrol = tarihUygunMu(secilenTarih);
    if (!tarihKontrol.uygun) {
        matrisAlani.innerHTML = `<p style='color: #e74c3c; font-weight: bold; padding: 20px; text-align: center;'>${tarihKontrol.mesaj}</p>`;
        return;
    }

    // YENİ: Ceza Süresi Kontrolü
    const guncelProfil = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', aktifKullanici.$id);
    if (guncelProfil.cezaAsamasi > 0 && guncelProfil.cezaTarihi) {
        if (secilenTarih <= guncelProfil.cezaTarihi) {
            matrisAlani.innerHTML = `<p style='color: #e74c3c; font-weight: bold; padding: 20px; background: #fdf2f8; border-radius: 8px; border: 1px solid #fecdd3; text-align: center;'>Ceza durumunuz nedeniyle ${guncelProfil.cezaTarihi} tarihine kadar (bu tarih dahil) randevu alamazsınız.</p>`;
            return; 
        }
    }

    matrisAlani.innerHTML = "<p style='text-align: center;'>Veriler yükleniyor, lütfen bekleyin...</p>";

    try {
        const cihazlar = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', [Query.equal('labID', secilenLabId)]);
        if (cihazlar.documents.length === 0) {
            matrisAlani.innerHTML = "<p style='text-align: center;'>Bu laboratuvarda henüz eklenmiş bir cihaz bulunmuyor.</p>";
            return;
        }

        const randevular = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', [Query.equal('tarih', secilenTarih), Query.equal('aktif', true)]);
        
        function getDoluluk(cihazId, saatAraligi) {
            return randevular.documents.filter(r => r.cihazId === cihazId && r.saatAraligi === saatAraligi && r.kullaniciId !== 'ADMIN_KAPALI').length;
        }

        function getKullaniciRandevusu(cihazId, saatAraligi) {
            return randevular.documents.some(r => r.cihazId === cihazId && r.saatAraligi === saatAraligi && r.kullaniciId === aktifKullanici.$id);
        }

        let tabloHTML = `<table border="1" style="width: 100%; border-collapse: collapse; text-align: center; vertical-align: middle;">`;
        tabloHTML += `<tr style="background-color: #34495e; color: white;">
            <th style="padding: 15px; text-align: center; vertical-align: middle;">Saatler / Cihazlar</th>`;
        
        cihazlar.documents.forEach(cihaz => {
            let durumEki = cihaz.durum !== 'çalışıyor' ? ` <br><span style="color:#ffb7b2;">(${cihaz.durum})</span>` : '';
            tabloHTML += `<th style="padding: 15px; text-align: center; vertical-align: middle;">${cihaz.cihazIsmi}${durumEki}<br><small style="font-weight:normal; color:#cbd5e1;">Kapasite: ${cihaz.kapasite}</small></th>`;
        });
        tabloHTML += `</tr>`;

        const saatler = ["10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"];

        saatler.forEach(saat => {
            tabloHTML += `<tr><td style="font-weight: bold; background-color: #ecf0f1; padding: 15px; text-align: center; vertical-align: middle;">${saat}</td>`;
            
            cihazlar.documents.forEach(cihaz => {
                if (cihaz.durum !== 'çalışıyor') {
                    tabloHTML += `<td style="background-color: #ffcccc; padding: 15px; text-align: center; vertical-align: middle; font-weight:bold; color:#c0392b;">KAPALI</td>`;
                    return;
                }

                let secimMetni = "";
                let doluluk = 0;
                let blokSaati = saat; 
                
                if (cihaz.kullanimTipi === 'uzun') {
                    if (saat === '10:00-11:00') {
                        blokSaati = '10:00-13:00';
                        doluluk = getDoluluk(cihaz.$id, blokSaati);
                        secimMetni = `10:00-13:00 Al (${doluluk}/${cihaz.kapasite})`;
                    } else if (saat === '13:00-14:00') {
                        blokSaati = '13:00-16:00';
                        doluluk = getDoluluk(cihaz.$id, blokSaati);
                        secimMetni = `13:00-16:00 Al (${doluluk}/${cihaz.kapasite})`;
                    } else {
                        tabloHTML += `<td style="color: #94a3b8; background-color: #f8fafc; padding: 15px; text-align: center; vertical-align: middle; font-style: italic;">- Blok İçi -</td>`;
                        return;
                    }
                } else {
                    doluluk = getDoluluk(cihaz.$id, saat);
                    secimMetni = `Seç (${doluluk}/${cihaz.kapasite})`;
                }

                let kullaniciZatenAldi = getKullaniciRandevusu(cihaz.$id, blokSaati);
                let yoneticiKapattiMi = randevular.documents.some(r => r.cihazId === cihaz.$id && r.saatAraligi === blokSaati && r.kullaniciId === 'ADMIN_KAPALI');

                if (yoneticiKapattiMi) {
                    tabloHTML += `<td style="background-color: #475569; padding: 10px; text-align: center; vertical-align: middle;">
                        <button class="btn" style="background-color: #334155; cursor: not-allowed; color: white; width: 100%; border: none; padding: 8px; border-radius: 6px;" disabled>⛔ KAPALI</button>
                    </td>`;
                } else if (kullaniciZatenAldi) {
                    tabloHTML += `<td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <button class="btn" style="background-color: #94a3b8; cursor: not-allowed; color: white; width: 100%; border: none; padding: 8px; border-radius: 6px;" disabled>Randevu Alındı (${doluluk}/${cihaz.kapasite})</button>
                    </td>`;
                } else if (doluluk >= cihaz.kapasite) {
                    tabloHTML += `<td style="background-color: #fee2e2; color: #dc2626; padding: 15px; text-align: center; vertical-align: middle; font-weight: bold;">DOLU (${doluluk}/${cihaz.kapasite})</td>`;
                } else {
                    tabloHTML += `<td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <button class="btn" style="transition: all 0.2s;" onclick="secimTetikle(this, '${cihaz.$id}', '${blokSaati}', '${cihaz.kullanimTipi}', '${secimMetni}')">${secimMetni}</button>
                    </td>`;
                }
            });
            tabloHTML += `</tr>`;
        });

        tabloHTML += `</table>`;
        
        tabloHTML += `
        <div style="margin-top: 25px; text-align: right; background: #f1f5f9; padding: 15px; border-radius: 8px;">
            <span id="secimOzetMetni" style="margin-right: 15px; font-weight: 600; color: #334155;">Henüz seçim yapılmadı.</span>
            <button id="btnTopluOnay" class="btn btn-success hidden" style="padding: 12px 24px; font-size: 15px;" onclick="seciliRandevulariOnayla()">Seçimleri Onayla (0)</button>
        </div>`;

        matrisAlani.innerHTML = tabloHTML;
        kotalariEkrandaGoster();

    } catch (error) {
        matrisAlani.innerHTML = "<p style='color:red; text-align: center;'>Bir hata oluştu. Lütfen tekrar deneyin.</p>";
    }
}

function secimTetikle(buton, cihazId, saatAraligi, tip, orjinalMetin) {
    const index = seciliRandevular.findIndex(r => r.cihazId === cihazId && r.saatAraligi === saatAraligi);

    if (index > -1) {
        seciliRandevular.splice(index, 1);
        buton.style.backgroundColor = ""; 
        buton.style.transform = "scale(1)";
        buton.innerText = orjinalMetin;
    } else {
        seciliRandevular.push({ cihazId, saatAraligi, tip });
        buton.style.backgroundColor = "#10b981"; 
        buton.style.transform = "scale(1.05)";
        buton.innerText = "Seçildi ✓";
    }

    const onayBtn = document.getElementById('btnTopluOnay');
    const ozetMetni = document.getElementById('secimOzetMetni');
    
    if (seciliRandevular.length > 0) {
        onayBtn.classList.remove('hidden');
        onayBtn.innerText = `Seçili Randevuları Onayla (${seciliRandevular.length})`;
        ozetMetni.innerText = `Toplam ${seciliRandevular.length} adet işlem seçildi.`;
    } else {
        onayBtn.classList.add('hidden');
        ozetMetni.innerText = "Henüz seçim yapılmadı.";
    }
}

async function seciliRandevulariOnayla() {
    if (seciliRandevular.length === 0) return;

    const ogrenciProfil = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', aktifKullanici.$id);
    if (ogrenciProfil.cezaAsamasi >= 3) {
        alert("Üzgünüz, ceza aşamanız nedeniyle randevu alamazsınız.");
        return;
    }

    const secilenTarih = document.getElementById('tarihSecim').value;
    
    try {
        const dbAyniSaatKontrol = await databases.listDocuments(
            '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70',
            [Query.equal('kullaniciId', aktifKullanici.$id), Query.equal('tarih', secilenTarih), Query.equal('aktif', true)]
        );
        
        for (let secim of seciliRandevular) {
            // Sadece aynı cihaza, aynı saatte tekrar kayıt atılmasını engeller.
            const ayniCihazMevcutMu = dbAyniSaatKontrol.documents.some(d => d.saatAraligi === secim.saatAraligi && d.cihazId === secim.cihazId);
            if (ayniCihazMevcutMu) {
                alert(`Mantıksız İşlem: ${secim.saatAraligi} saatinde seçtiğiniz cihaza zaten sistemde aktif bir randevunuz var! Seçimleri temizleyiniz.`);
                return;
            }
        }
    } catch(e) {}

    const { baslangic, bitis } = getHaftaAraligi(secilenTarih);
    const mevcutRandevular = await databases.listDocuments(
        '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70',
        [Query.equal('kullaniciId', aktifKullanici.$id), Query.equal('aktif', true), Query.greaterThanEqual('tarih', baslangic), Query.lessThanEqual('tarih', bitis)]
    );

    let harcananNormal = 0; let harcananUzun = 0;
    for (let r of mevcutRandevular.documents) {
        try {
            const c = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', r.cihazId);
            if (c.kullanimTipi === 'normal') harcananNormal++;
            else if (c.kullanimTipi === 'uzun') harcananUzun++;
        } catch (e) {}
    }

    const eklenecekNormal = seciliRandevular.filter(r => r.tip === 'normal').length;
    const eklenecekUzun = seciliRandevular.filter(r => r.tip === 'uzun').length;

    if (harcananNormal + eklenecekNormal > 15) {
        alert(`Haftalık normal kotanızı aşıyorsunuz! (Kalan Hakkınız: ${15 - harcananNormal}, Seçtiğiniz: ${eklenecekNormal})`);
        return;
    }
    if (harcananUzun + eklenecekUzun > 3) {
        alert(`Haftalık uzun kullanım kotanızı aşıyorsunuz! (Kalan Hakkınız: ${3 - harcananUzun}, Seçtiğiniz: ${eklenecekUzun})`);
        return;
    }

    if (!confirm(`Toplam ${seciliRandevular.length} adet randevuyu onaylamak istediğinize emin misiniz?`)) return;

    const btnOnay = document.getElementById('btnTopluOnay');
    btnOnay.innerText = "Kaydediliyor...";
    btnOnay.disabled = true;

    const danisman = aktifKullanici.danismanId ? aktifKullanici.danismanId : "yok";
    const onayi = aktifKullanici.rol === "ogrenci" ? "bekliyor" : "onaylandi";
    let hataVarMi = false;

    for (let secim of seciliRandevular) {
        try {
            await databases.createDocument(
                '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', ID.unique(),
                {
                    cihazId: secim.cihazId,
                    kullaniciId: aktifKullanici.$id,
                    danismanId: danisman,
                    tarih: secilenTarih,
                    saatAraligi: secim.saatAraligi,
                    danismanOnayi: onayi,
                    gerceklesmeDurumu: "bekliyor",
                    aktif: true
                }
            );
        } catch (err) {
            hataVarMi = true;
        }
    }

    if (hataVarMi) alert("Bazı randevular oluşturulurken veritabanı hatası yaşandı.");
    else alert("Tüm randevular başarıyla alındı ve onaylandı!");

    seciliRandevular = []; 
    matrisiGuncelle();     
}

function getHaftaAraligi(tarihStr) {
    const curr = new Date(tarihStr);
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); 
    const last = first + 6; 

    const baslangic = new Date(curr.setDate(first)).toISOString().split('T')[0];
    const bitis = new Date(curr.setDate(last)).toISOString().split('T')[0];
    
    return { baslangic, bitis };
}

// 1. Kutucuklara Tıklandığında Seçimi Aktif/Pasif Yapan Fonksiyon
// 1. Kutucuklara Tıklandığında Seçimi Aktif/Pasif Yapan Fonksiyon
function secimTetikle(buton, cihazId, saatAraligi, tip, orjinalMetin) {
    const index = seciliRandevular.findIndex(r => r.cihazId === cihazId && r.saatAraligi === saatAraligi);

    if (index > -1) {
        // Zaten seçiliyse iptal et
        seciliRandevular.splice(index, 1);
        buton.style.backgroundColor = ""; 
        buton.style.transform = "scale(1)";
        buton.innerText = orjinalMetin;
    } else {
        // Yeni seçim: Farklı cihaz olduğu sürece aynı saate izin verilir
        seciliRandevular.push({ cihazId, saatAraligi, tip });
        buton.style.backgroundColor = "#10b981"; 
        buton.style.transform = "scale(1.05)";
        buton.innerText = "Seçildi ✓";
    }

    const onayBtn = document.getElementById('btnTopluOnay');
    const ozetMetni = document.getElementById('secimOzetMetni');
    
    if (seciliRandevular.length > 0) {
        onayBtn.classList.remove('hidden');
        onayBtn.innerText = `Seçili Randevuları Onayla (${seciliRandevular.length})`;
        ozetMetni.innerText = `Toplam ${seciliRandevular.length} adet işlem seçildi.`;
    } else {
        onayBtn.classList.add('hidden');
        ozetMetni.innerText = "Henüz seçim yapılmadı.";
    }
}

// 2. Seçili Randevuları Doğrulayıp Veritabanına Yazan Fonksiyon
async function seciliRandevulariOnayla() {
    if (seciliRandevular.length === 0) return;

    const ogrenciProfil = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', aktifKullanici.$id);
    const secilenTarih = document.getElementById('tarihSecim').value; // Sadece bir defa tanımlandı

    // YENİ CEZA KONTROLÜ
    if (ogrenciProfil.cezaAsamasi > 0 && ogrenciProfil.cezaTarihi) {
        if (secilenTarih <= ogrenciProfil.cezaTarihi) {
            alert(`Ceza durumunuz nedeniyle ${ogrenciProfil.cezaTarihi} tarihine kadar işlem yapamazsınız.`);
            return;
        }
    }

    try {
        const dbAyniSaatKontrol = await databases.listDocuments(
            '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70',
            [Query.equal('kullaniciId', aktifKullanici.$id), Query.equal('tarih', secilenTarih), Query.equal('aktif', true)]
        );
        
        for (let secim of seciliRandevular) {
            const ayniCihazMevcutMu = dbAyniSaatKontrol.documents.some(d => d.saatAraligi === secim.saatAraligi && d.cihazId === secim.cihazId);
            if (ayniCihazMevcutMu) {
                alert(`Hata: ${secim.saatAraligi} saatinde seçtiğiniz cihaza zaten aktif bir randevunuz var! Lütfen seçimlerinizi temizleyin.`);
                return;
            }
        }
    } catch(e) {}

    const { baslangic, bitis } = getHaftaAraligi(secilenTarih);
    const mevcutRandevular = await databases.listDocuments(
        '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70',
        [Query.equal('kullaniciId', aktifKullanici.$id), Query.equal('aktif', true), Query.greaterThanEqual('tarih', baslangic), Query.lessThanEqual('tarih', bitis)]
    );

    let harcananNormal = 0; let harcananUzun = 0;
    for (let r of mevcutRandevular.documents) {
        try {
            const c = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', r.cihazId);
            if (c.kullanimTipi === 'normal') harcananNormal++;
            else if (c.kullanimTipi === 'uzun') harcananUzun++;
        } catch (e) {}
    }

    const eklenecekNormal = seciliRandevular.filter(r => r.tip === 'normal').length;
    const eklenecekUzun = seciliRandevular.filter(r => r.tip === 'uzun').length;

    if (harcananNormal + eklenecekNormal > 15) {
        alert(`Haftalık normal kotanızı aşıyorsunuz! (Kalan Hakkınız: ${15 - harcananNormal}, Seçtiğiniz: ${eklenecekNormal})`);
        return;
    }
    if (harcananUzun + eklenecekUzun > 3) {
        alert(`Haftalık uzun kullanım kotanızı aşıyorsunuz! (Kalan Hakkınız: ${3 - harcananUzun}, Seçtiğiniz: ${eklenecekUzun})`);
        return;
    }

    if (!confirm(`Toplam ${seciliRandevular.length} adet randevuyu onaylamak istediğinize emin misiniz?`)) return;

    const btnOnay = document.getElementById('btnTopluOnay');
    btnOnay.innerText = "Kaydediliyor...";
    btnOnay.disabled = true;

    const danisman = aktifKullanici.danismanId ? aktifKullanici.danismanId : "yok";
    const onayi = aktifKullanici.rol === "ogrenci" ? "bekliyor" : "onaylandi";
    let hataVarMi = false;

    for (let secim of seciliRandevular) {
        try {
            await databases.createDocument(
                '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', ID.unique(),
                {
                    cihazId: secim.cihazId,
                    kullaniciId: aktifKullanici.$id,
                    danismanId: danisman,
                    tarih: secilenTarih,
                    saatAraligi: secim.saatAraligi,
                    danismanOnayi: onayi,
                    gerceklesmeDurumu: "bekliyor",
                    aktif: true
                }
            );
        } catch (err) {
            hataVarMi = true;
        }
    }

    if (hataVarMi) alert("Bazı randevular oluşturulurken veritabanı hatası yaşandı.");
    else alert("Tüm randevular başarıyla alındı ve onaylandı!");

    seciliRandevular = []; 
    matrisiGuncelle();     
}

async function randevularimiGetir() {
    const listeAlani = document.getElementById('randevularimListesi');
    listeAlani.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const randevular = await databases.listDocuments(
            '6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70',
            [Query.equal('kullaniciId', aktifKullanici.$id), Query.equal('aktif', true)]
        );

        if (randevular.documents.length === 0) {
            listeAlani.innerHTML = "<p style='text-align:center; color:#64748b; padding: 20px;'>Henüz aktif bir randevunuz bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table border="1" style="width: 100%; border-collapse: collapse; text-align: center; vertical-align: middle;">
            <tr style="background-color: #34495e; color: white;">
                <th style="padding: 10px; width: 40px;"><input type="checkbox" id="hepsiniSecCb" onclick="hepsiniSecTetikle(this)" style="cursor:pointer; transform:scale(1.2);"></th>
                <th style="padding: 12px;">Laboratuvar</th>
                <th>Cihaz</th>
                <th>Tarih</th>
                <th>Saat Aralığı</th>
                <th>Danışman Onayı</th>
                <th>İşlem</th>
            </tr>`;

        for (let r of randevular.documents) {
            let labIsmi = "Bilinmiyor", cihazIsmi = "Bilinmiyor";
            try {
                const cihaz = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', r.cihazId);
                cihazIsmi = cihaz.cihazIsmi;
                const lab = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a670034731ee85e', cihaz.labID);
                labIsmi = lab.labIsmi;
            } catch (e) { }

            let onayStil = r.danismanOnayi === "onaylandi" ? "color: green; font-weight: bold;" : (r.danismanOnayi === "reddedildi" ? "color: red; font-weight: bold;" : "color: orange; font-weight: bold;");
            let onayMetin = r.danismanOnayi === "onaylandi" ? "Onaylandı" : (r.danismanOnayi === "reddedildi" ? "Reddedildi" : "Onay Bekliyor");

            tabloHTML += `<tr>
                <td style="padding: 10px;"><input type="checkbox" class="randevu-checkbox" value="${r.$id}" data-tarih="${r.tarih}" onchange="iptalSecimKontrol()" style="cursor:pointer; transform:scale(1.2);"></td>
                <td style="font-weight: 500; color: #1e293b;">${labIsmi}</td>
                <td style="font-weight: 500; color: #3b82f6;">${cihazIsmi}</td>
                <td>${r.tarih}</td>
                <td>${r.saatAraligi}</td>
                <td style="${onayStil}">${onayMetin}</td>
                <td><button class="btn btn-danger" style="padding: 6px 12px;" onclick="randevuIptal('${r.$id}', '${r.tarih}')">İptal Et</button></td>
            </tr>`;
        }

        tabloHTML += `</table>`;
        
        // Toplu İşlem Paneli
        tabloHTML += `
        <div style="margin-top: 20px; text-align: right; background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
            <span id="iptalOzetMetni" style="margin-right: 15px; font-weight: 600; color: #7f1d1d;">Henüz seçim yapılmadı.</span>
            <button id="btnTopluIptal" class="btn btn-danger hidden" style="padding: 10px 20px;" onclick="seciliRandevulariIptalEt()">Seçili Randevuları İptal Et (0)</button>
        </div>`;

        listeAlani.innerHTML = tabloHTML;

    } catch (error) {
        listeAlani.innerHTML = "<p>Randevularınız getirilirken bir hata oluştu.</p>";
    }
}

// Randevu iptal etme ve süre kuralı denetleme fonksiyonu
async function randevuIptal(randevuId, randevuTarihi) {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    const randevuGunu = new Date(randevuTarihi);
    randevuGunu.setHours(0, 0, 0, 0);

    // İptal son tarih hesaplama (Randevu gününden 1 gün öncesi gece 23:59)
    const sonIptalTarihi = new Date(randevuGunu);
    sonIptalTarihi.setDate(sonIptalTarihi.getDate() - 1);

    if (bugun > sonIptalTarihi) {
        alert("İptal süresi geçmiştir! Randevular en geç randevu tarihinden 1 gün önce 23:59'a kadar iptal edilebilir.");
        return;
    }

    if (!confirm("Bu randevuyu iptal etmek istediğinize emin misiniz? Haftalık kotanız anında geri yüklenecektir.")) return;

    try {
        // Randevuyu veritabanında 'aktif: false' yaparak iptal ediyoruz
        await databases.updateDocument(
            '6a9c4942003cfdd06f0f',
            '6a9c4aba0033224cea70',
            randevuId,
            { aktif: false }
        );

        alert("Randevunuz başarıyla iptal edildi. Kotanız geri yüklendi!");
        
        // 1. Randevularım listesini güncelle
        randevularimiGetir(); 

        // 2. Arka plandaki matrisi ve kotaları da anında tazele (Görsel bug'ı çözer)
        if (document.getElementById('tarihSecim').value) {
            kotalariEkrandaGoster();
            
            // Eğer bir lab seçiliyse matrisi de çiz
            if (document.getElementById('labSecim').value) {
                matrisiGuncelle();
            }
        }

    } catch (error) {
        alert("İptal işlemi sırasında hata: " + error.message);
    }
}

async function ogrencilerimiGetir() {
    const alan = document.getElementById('ogrencilerimListesi');
    alan.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const ogrenciler = await databases.listDocuments(
            '6a9c4942003cfdd06f0f', 
            '6a9c49700018c0fef5c8', 
            [
                Query.equal('danismanId', aktifKullanici.$id),
                Query.equal('rol', 'ogrenci')
            ]
        );

        if (ogrenciler.documents.length === 0) {
            alan.innerHTML = "<p>Danışmanlığınızı yapan kayıtlı öğrenci bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table><tr><th>İsim Soyisim</th><th>Telefon</th><th>Kayıt Onay Durumu</th><th>İşlem</th></tr>`;

        ogrenciler.documents.forEach(ogr => {
            let durumText = ogr.danismanOnayi ? "<span style='color:green; font-weight:bold;'>Onaylı</span>" : "<span style='color:orange; font-weight:bold;'>Bekliyor</span>";
            let butonText = ogr.danismanOnayi ? "Onayı Kaldır" : "Hesabı Onayla";
            let yeniDurum = !ogr.danismanOnayi;

            tabloHTML += `<tr>
                <td>${ogr.isimSoyisim}</td>
                <td>${ogr.telefon || 'Belirtilmemiş'}</td>
                <td>${durumText}</td>
                <td><button class="btn" onclick="ogrenciOnayGuncelle('${ogr.$id}', ${yeniDurum})">${butonText}</button></td>
            </tr>`;
        });

        tabloHTML += `</table>`;
        alan.innerHTML = tabloHTML;

    } catch (error) {
        console.error("Öğrenciler yüklenirken hata:", error);
        alan.innerHTML = "<p>Öğrenciler getirilirken bir hata oluştu.</p>";
    }
}

async function ogrenciOnayGuncelle(ogrenciId, yeniDurum) {
    try {
        await databases.updateDocument(
            '6a9c4942003cfdd06f0f',
            '6a9c49700018c0fef5c8',
            ogrenciId,
            { danismanOnayi: yeniDurum }
        );
        alert("Öğrenci onay durumu güncellendi!");
        ogrencilerimiGetir();
    } catch (error) {
        alert("İşlem başarısız: " + error.message);
    }
}

async function ogrenciRandevulariniGetir() {
    const alan = document.getElementById('ogrenciRandevulariListesi');
    alan.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const randevular = await databases.listDocuments(
            '6a9c4942003cfdd06f0f',
            '6a9c4aba0033224cea70',
            [
                Query.equal('danismanId', aktifKullanici.$id),
                Query.equal('aktif', true)
            ]
        );

        if (randevular.documents.length === 0) {
            alan.innerHTML = "<p>Öğrenciye ait aktif randevu bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table><tr><th>Öğrenci ID</th><th>Tarih</th><th>Saat Aralığı</th><th>Onay Durumu</th><th>İşlemler</th></tr>`;

        for (let r of randevular.documents) {
            tabloHTML += `<tr>
                <td>${r.kullaniciId}</td>
                <td>${r.tarih}</td>
                <td>${r.saatAraligi}</td>
                <td><b>${r.danismanOnayi}</b></td>
                <td>
                    <button class="btn btn-success" onclick="randevuOnayVer('${r.$id}', 'onaylandi')">Onayla</button>
                    <button class="btn btn-danger" onclick="randevuOnayVer('${r.$id}', 'reddedildi')">Reddet</button>
                </td>
            </tr>`;
        }

        tabloHTML += `</table>`;
        alan.innerHTML = tabloHTML;

    } catch (error) {
        console.error("Öğrenci randevuları yüklenirken hata:", error);
        alan.innerHTML = "<p>Randevular yüklenirken hata oluştu.</p>";
    }
}

async function randevuOnayVer(randevuId, durum) {
    try {
        await databases.updateDocument(
            '6a9c4942003cfdd06f0f',
            '6a9c4aba0033224cea70',
            randevuId,
            { danismanOnayi: durum }
        );
        alert(`Randevu ${durum} olarak işaretlendi.`);
        ogrenciRandevulariniGetir();
    } catch (error) {
        alert("Güncelleme hatası: " + error.message);
    }
}

// Aktif, zamanı GEÇMİŞ ve henüz değerlendirilmemiş randevuları listeleyen ceza paneli
async function cezaVerileriniGetir() {
    const alan = document.getElementById('cezaListesiAlani');
    alan.innerHTML = "<p>Yükleniyor...</p>";

    try {
        // Sadece geçmiş tarihleri getirmek için bugünün tarihini YYYY-MM-DD olarak alıyoruz
        const bugun = new Date();
        bugun.setHours(0, 0, 0, 0);
        const bugunStr = bugun.toISOString().split('T')[0];

        // Aktif olan VE tarihi bugünden küçük (geçmiş) olan randevuları çek
        const randevular = await databases.listDocuments(
            '6a9c4942003cfdd06f0f',
            '6a9c4aba0033224cea70',
            [
                Query.equal('aktif', true),
                Query.lessThan('tarih', bugunStr)
            ]
        );

        // Eğer sistemde daha önceden ceza verilmiş (gelmedi işaretlenmiş) olanları listeden 
        // gizlemek istersen JavaScript ile küçük bir filtreleme yapıyoruz:
        const bekleyenRandevular = randevular.documents.filter(r => r.gerceklesmeDurumu !== "gelmedi");

        if (bekleyenRandevular.length === 0) {
            alan.innerHTML = "<p style='text-align:center; color:#64748b; padding: 20px;'>Sistemde değerlendirilmesi gereken geçmiş tarihli randevu bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table border="1" style="width: 100%; border-collapse: collapse; text-align: center; vertical-align: middle; margin-top: 15px;">
            <tr style="background-color: #34495e; color: white;">
                <th style="padding: 12px;">Öğrenci Bilgisi</th>
                <th>Telefon</th>
                <th>Danışman Hoca</th>
                <th>Cihaz & Zaman</th>
                <th>İşlem (Gelmedi İşaretle)</th>
            </tr>`;

        for (let r of bekleyenRandevular) {
            let ogrIsimNo = "Bilinmiyor";
            let telefon = "Belirtilmemiş";
            let danismanIsim = "Bilinmiyor";
            let labCihazBilgisi = `${r.tarih} | ${r.saatAraligi}`;

            // 1. Öğrenci Profilinden: İsim, Gerçek Öğrenci Numarası ve Telefon Çekiliyor
            try {
                const ogr = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', r.kullaniciId);
                // Veritabanındaki kolon ismine göre otomatik yakalar (ogrenciNo, kurumsalId veya ogrId)
                const gercekNo = ogr.ogrenciNo || ogr.kurumsalId || ogr.ogrId || r.kullaniciId;
                ogrIsimNo = `<span style="font-size:13px; color:#64748b;">${gercekNo}</span><br><b>${ogr.isimSoyisim}</b>`;
                telefon = ogr.telefon || "Belirtilmemiş";
            } catch (e) { console.warn("Öğrenci bilgisi çekilemedi."); }

            // 2. Danışman Hoca Bilgisi Çekiliyor
            if (r.danismanId && r.danismanId !== "yok") {
                try {
                    const danisman = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', r.danismanId);
                    danismanIsim = danisman.isimSoyisim;
                } catch (e) { }
            }

            // 3. Hangi Cihaz Olduğu Bilgisi Çekiliyor
            try {
                const cihaz = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', r.cihazId);
                labCihazBilgisi = `<b>${cihaz.cihazIsmi}</b><br><span style="font-size:13px; color:#64748b;">${r.tarih} | ${r.saatAraligi}</span>`;
            } catch (e) { }

            tabloHTML += `<tr>
                <td style="padding: 12px; text-align: left;">${ogrIsimNo}</td>
                <td>${telefon}</td>
                <td>${danismanIsim}</td>
                <td>${labCihazBilgisi}</td>
                <td>
                    <button class="btn btn-danger" style="padding: 6px 12px;" onclick="cezaUygula('${r.kullaniciId}', '${r.$id}')">Gelmedi (Ceza Ver)</button>
                </td>
            </tr>`;
        }

        tabloHTML += `</table>`;
        alan.innerHTML = tabloHTML;

    } catch (error) {
        console.error("Ceza paneli yüklenirken hata:", error);
        alan.innerHTML = "<p style='color:red;'>Veriler yüklenirken bir hata oluştu.</p>";
    }
}

async function cezaUygula(ogrenciId, randevuId) {
    if (!confirm("Öğrencinin gelmediğini onaylıyor ve ceza sistemini (iptaller dahil) işletmek istiyor musunuz?")) return;

    try {
        const randevu = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', randevuId);
        const ogrenciProfil = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', ogrenciId);

        let mevcutCeza = ogrenciProfil.cezaAsamasi || 0;
        let yeniCezaAsamasi = mevcutCeza + 1;
        
        let cezaGunSayisi = 7; // 1. kademe (1 hafta)
        if (yeniCezaAsamasi === 2) cezaGunSayisi = 14; // 2. kademe (2 hafta)
        else if (yeniCezaAsamasi >= 3) cezaGunSayisi = 21; // 3+ kademe (3 hafta)

        // Bitiş tarihini kaçırılan randevu tarihi üzerinden hesapla
        const randevuTarihiObj = new Date(randevu.tarih);
        randevuTarihiObj.setDate(randevuTarihiObj.getDate() + cezaGunSayisi);
        const cezaBitisTarihiStr = randevuTarihiObj.toISOString().split('T')[0];

        // 1. Profilde cezayı güncelle
        await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', ogrenciId, {
            cezaAsamasi: yeniCezaAsamasi,
            cezaTarihi: cezaBitisTarihiStr 
        });

        // 2. Kaçırılan randevuyu kapat
        await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', randevuId, { 
            gerceklesmeDurumu: "gelmedi",
            aktif: false
        });

        // 3. Ceza aralığındaki TÜM mevcut randevuları otomatik iptal et
        const iptalEdilecekler = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', [
            Query.equal('kullaniciId', ogrenciId),
            Query.equal('aktif', true),
            Query.lessThanEqual('tarih', cezaBitisTarihiStr)
        ]);

        let iptalSayisi = 0;
        for (let iptalR of iptalEdilecekler.documents) {
            await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', iptalR.$id, {
                aktif: false,
                gerceklesmeDurumu: "iptal_ceza"
            });
            iptalSayisi++;
        }

        alert(`Öğrenci ${yeniCezaAsamasi}. kademe cezaya ulaştı.\n${cezaBitisTarihiStr} tarihine kadar randevu alamaz.\nBu tarihe kadar olan ${iptalSayisi} adet randevusu otomatik iptal edildi.`);
        cezaVerileriniGetir();

    } catch (error) {
        alert("Ceza uygulanırken hata: " + error.message);
    }
}

async function tumOgrencileriGetir() {
    const alan = document.getElementById('tumOgrencilerListesi');
    alan.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const ogrenciler = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c49700018c0fef5c8', [Query.equal('rol', 'ogrenci')]);

        if (ogrenciler.documents.length === 0) {
            alan.innerHTML = "<p>Sistemde kayıtlı öğrenci bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table><tr><th>İsim Soyisim</th><th>Telefon</th><th>Danışman Onayı</th><th>Ceza Durumu</th><th>İşlem</th></tr>`;
        const bugunStr = new Date().toISOString().split('T')[0];

        ogrenciler.documents.forEach(ogr => {
            let onayDurum = ogr.danismanOnayi ? "<span style='color:green'>Onaylı</span>" : "<span style='color:orange'>Bekliyor</span>";
            let cezaMetni = `<b>Aşama ${ogr.cezaAsamasi || 0}</b>`;
            
            if (ogr.cezaAsamasi > 0 && ogr.cezaTarihi) {
                if (ogr.cezaTarihi >= bugunStr) cezaMetni += `<br><small style="color:#dc2626;">Bloke: ${ogr.cezaTarihi} dahil</small>`;
                else cezaMetni += `<br><small style="color:#16a34a;">Cezası Bitti</small>`;
            }

            tabloHTML += `<tr>
                <td>${ogr.isimSoyisim}</td>
                <td>${ogr.telefon}</td>
                <td>${onayDurum}</td>
                <td>${cezaMetni}</td>
                <td><button class="btn btn-success" onclick="cezaSuresiniKaldir('${ogr.$id}')">Cezayı Kaldır</button></td>
            </tr>`;
        });

        tabloHTML += `</table>`;
        alan.innerHTML = tabloHTML;

    } catch (error) {
        console.error("Öğrenciler yüklenirken hata:", error);
        alan.innerHTML = "<p>Öğrenciler yüklenirken hata oluştu.</p>";
    }
}

async function cezaSuresiniKaldir(ogrenciId) {
    if (!confirm("Bu öğrencinin ceza süresini kaldırıp randevu alabilmesini istiyor musunuz? (Not: Öğrencinin mevcut aşama numarası kalacaktır, sıfırlanmayacaktır.)")) return;
    try {
        // Sadece ceza tarihini sıfırlıyoruz, cezaAsamasi veritabanında olduğu gibi kalıyor
        await databases.updateDocument(
            '6a9c4942003cfdd06f0f',
            '6a9c49700018c0fef5c8',
            ogrenciId,
            { cezaTarihi: null }
        );
        alert("Öğrencinin ceza süresi kaldırıldı. Artık randevu alabilir (Aşaması korundu).");
        tumOgrencileriGetir();
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

async function labYonetimEkraniniGetir() {
    adminLablariListele(); 
    
    const cihazListesiAlani = document.getElementById('labYonetimListesi');
    const labSecimMenu = document.getElementById('yeniCihazLabSecim');
    // Bu satırı bul ve id ismini güncelle
    const blokLabSecimMenu = document.getElementById('adminBlokLabSecim'); // YENİ: Blok kapatma menüsünü seçiyoruz
    
    cihazListesiAlani.innerHTML = "<p>Yükleniyor...</p>";

    try {
        const labs = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4a670034731ee85e');
        
        labSecimMenu.innerHTML = "";
        if (blokLabSecimMenu) blokLabSecimMenu.innerHTML = "<option value=''>-- Lab Seçin --</option>"; // YENİ: Menüyü sıfırlıyoruz
        
        if (labs.documents.length === 0) {
            labSecimMenu.innerHTML = "<option value=''>Önce Lab Ekleyin</option>";
            cihazListesiAlani.innerHTML = "<p>Sistemde kayıtlı laboratuvar bulunmuyor.</p>";
            return;
        }

        labs.documents.forEach(lab => {
            // 1. Yeni Cihaz Ekleme paneline labları ekler
            const opt = document.createElement('option');
            opt.value = lab.$id;
            opt.text = lab.labIsmi;
            labSecimMenu.add(opt);

            // 2. Blok Kapatma paneline labları ekler (YENİ EKLENEN KISIM)
            if (blokLabSecimMenu) {
                const blokOpt = document.createElement('option');
                blokOpt.value = lab.$id;
                blokOpt.text = lab.labIsmi;
                blokLabSecimMenu.add(blokOpt);
            }
        });

        // Dropdown değiştiğinde listeyi filtrelemesi için olayı (event) atıyoruz
        labSecimMenu.setAttribute("onchange", "seciliLabinCihazlariniGetir()");

        // İlk açılışta seçili olan (ilk) laboratuvarın cihazlarını listele
        seciliLabinCihazlariniGetir();

    } catch (error) {
        cihazListesiAlani.innerHTML = "<p>Veriler yüklenirken hata oluştu.</p>";
    }
}

// YENİ FONKSİYON: Sadece o an seçili olan laboratuvardaki cihazları filtreler
async function seciliLabinCihazlariniGetir() {
    const cihazListesiAlani = document.getElementById('labYonetimListesi');
    const secilenLabId = document.getElementById('yeniCihazLabSecim').value;

    if (!secilenLabId) return;
    cihazListesiAlani.innerHTML = "<p>Cihazlar yükleniyor...</p>";

    try {
        // Query ile filtreleme yapılıyor
        const cihazlar = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', [
            Query.equal('labID', secilenLabId)
        ]);

        if (cihazlar.documents.length === 0) {
            cihazListesiAlani.innerHTML = "<p>Bu laboratuvarda kayıtlı cihaz bulunmuyor.</p>";
            return;
        }

        let tabloHTML = `<table><tr><th>Cihaz İsmi</th><th>Kullanım Tipi</th><th>Kapasite</th><th>Durum</th><th>İşlem</th></tr>`;

        cihazlar.documents.forEach(c => {
            let durumRenk = c.durum === 'çalışıyor' ? 'color:green; font-weight:bold;' : 'color:red; font-weight:bold;';
            let yeniDurum = c.durum === 'çalışıyor' ? 'bakımda' : 'çalışıyor';
            let butonYazi = c.durum === 'çalışıyor' ? 'Arızalı / Bakıma Al' : 'Çalışır Duruma Getir';

            tabloHTML += `<tr>
                <td>${c.cihazIsmi}</td>
                <td>${c.kullanimTipi}</td>
                <td>${c.kapasite}</td>
                <td style="${durumRenk}">${c.durum}</td>
                <td>
                    <button class="btn btn-warning" style="margin-bottom: 5px;" onclick="cihazDurumGuncelle('${c.$id}', '${yeniDurum}')">${butonYazi}</button>
                    <button class="btn btn-danger" onclick="cihazSil('${c.$id}')">Sil</button>
                </td>
            </tr>`;
        });

        tabloHTML += `</table>`;
        cihazListesiAlani.innerHTML = tabloHTML;

    } catch (error) {
        cihazListesiAlani.innerHTML = "<p>Cihazlar yüklenirken hata oluştu.</p>";
    }
}

async function cihazEkle() {
    const labID = document.getElementById('yeniCihazLabSecim').value;
    const cihazIsmi = document.getElementById('yeniCihazIsmi').value.trim();
    const kullanimTipi = document.getElementById('yeniCihazTip').value;
    const kapasite = parseInt(document.getElementById('yeniCihazKapasite').value);

    if (!cihazIsmi || !kapasite) { alert("Lütfen tüm alanları doldurun."); return; }

    try {
        await databases.createDocument(
            '6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', ID.unique(),
            { labID: labID, cihazIsmi: cihazIsmi, kullanimTipi: kullanimTipi, kapasite: kapasite, durum: "çalışıyor" }
        );

        alert("Yeni cihaz başarıyla eklendi!");
        document.getElementById('yeniCihazIsmi').value = "";
        
        seciliLabinCihazlariniGetir(); // Sadece mevcut labın listesini tazele
    } catch (error) {
        alert("Cihaz eklenirken hata oluştu: " + error.message);
    }
}

async function cihazDurumGuncelle(cihazId, yeniDurum) {
    try {
        await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', cihazId, { durum: yeniDurum });
        alert("Cihaz durumu güncellendi!");
        seciliLabinCihazlariniGetir();
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

async function cihazSil(cihazId) {
    if (!confirm("Bu cihazı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
        await databases.deleteDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', cihazId);
        alert("Cihaz başarıyla silindi!");
        seciliLabinCihazlariniGetir();
    } catch (error) {
        alert("Cihaz silinirken hata: " + error.message);
    }
}
// Seçilen tarihin bulunduğu haftaya göre kalan kotaları hesaplayıp ekrana yazdıran fonksiyon
async function kotalariEkrandaGoster() {
    if (aktifKullanici.rol !== 'ogrenci') return; // Sadece öğrencilerde kota görünür
    
    document.getElementById('kotaBilgisi').style.display = 'block';
    const secilenTarih = document.getElementById('tarihSecim').value;
    if (!secilenTarih) return;

    const { baslangic, bitis } = getHaftaAraligi(secilenTarih);

    try {
        const mevcutRandevular = await databases.listDocuments(
            '6a9c4942003cfdd06f0f',
            '6a9c4aba0033224cea70',
            [
                Query.equal('kullaniciId', aktifKullanici.$id),
                Query.equal('aktif', true),
                Query.greaterThanEqual('tarih', baslangic),
                Query.lessThanEqual('tarih', bitis)
            ]
        );

        let harcananNormalSaat = 0;
        let harcananUzunBlok = 0;

        for (let r of mevcutRandevular.documents) {
            try {
                const c = await databases.getDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', r.cihazId);
                if (c.kullanimTipi === 'normal') harcananNormalSaat += 1;
                else if (c.kullanimTipi === 'uzun') harcananUzunBlok += 1;
            } catch (e) { }
        }

        let kalanNormal = 15 - harcananNormalSaat;
        let kalanUzun = 3 - harcananUzunBlok;

        document.getElementById('kalanNormalSaat').innerText = kalanNormal > 0 ? kalanNormal : 0;
        document.getElementById('kalanUzunBlok').innerText = kalanUzun > 0 ? kalanUzun : 0;
        
        // Eğer kotalar bittiyse kırmızıyla uyar
        document.getElementById('kalanNormalSaat').style.color = kalanNormal <= 0 ? 'red' : '#0c4a6e';
        document.getElementById('kalanUzunBlok').style.color = kalanUzun <= 0 ? 'red' : '#0c4a6e';

    } catch (error) {
        console.error("Kota bilgisi çekilemedi", error);
    }
}
// Seçilen tarihin randevu kurallarına uygunluğunu denetleyen yardımcı fonksiyon
function tarihUygunMu(tarihStr) {
    // 1. Aynı Gün veya Geçmiş Tarih Kontrolü
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0); // Bugünün saatini gece yarısına sıfırla
    
    const secilenGece = new Date(tarihStr);
    secilenGece.setHours(0, 0, 0, 0);

    if (secilenGece <= bugun) {
        return { uygun: false, mesaj: "Aynı güne veya geçmiş tarihlere randevu alınamaz! En erken yarın için işlem yapabilirsiniz." };
    }

    // 2. Hafta Sonu Kontrolü (0: Pazar, 6: Cumartesi)
    const gun = secilenGece.getDay();
    if (gun === 0 || gun === 6) {
        return { uygun: false, mesaj: "Hafta sonları (Cumartesi - Pazar) laboratuvar kapalıdır. Randevu oluşturulamaz." };
    }

    // 3. Sabit Resmi Tatiller (MM-DD Formatında)
    const ayGun = tarihStr.substring(5); // Örn: 2026-10-29 -> 10-29
    const resmiTatiller = [
        "01-01", // Yılbaşı
        "04-23", // Ulusal Egemenlik ve Çocuk Bayramı
        "05-01", // Emek ve Dayanışma Günü
        "05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
        "07-15", // Demokrasi ve Milli Birlik Günü
        "08-30", // Zafer Bayramı
        "10-29"  // Cumhuriyet Bayramı
        // Not: Ramazan ve Kurban Bayramı tarihleri her yıl değiştiği için yönetici tarafından manuel kısıtlanabilir veya buraya eklenebilir.
    ];

    if (resmiTatiller.includes(ayGun)) {
        return { uygun: false, mesaj: "Seçtiğiniz tarih resmi tatil olduğu için laboratuvar kullanıma kapalıdır." };
    }

    return { uygun: true };
}
// Checkbox Tümünü Seç/Kaldır
function hepsiniSecTetikle(anaCheckbox) {
    const checkboxes = document.querySelectorAll('.randevu-checkbox');
    checkboxes.forEach(cb => cb.checked = anaCheckbox.checked);
    iptalSecimKontrol();
}

// Seçim Durumuna Göre Butonu Göster/Gizle
function iptalSecimKontrol() {
    const seciliKutular = document.querySelectorAll('.randevu-checkbox:checked');
    const iptalBtn = document.getElementById('btnTopluIptal');
    const ozetMetni = document.getElementById('iptalOzetMetni');
    
    if (seciliKutular.length > 0) {
        iptalBtn.classList.remove('hidden');
        iptalBtn.innerText = `Seçili Olanları İptal Et (${seciliKutular.length})`;
        ozetMetni.innerText = `Toplam ${seciliKutular.length} kayıt seçildi.`;
    } else {
        iptalBtn.classList.add('hidden');
        ozetMetni.innerText = "Henüz seçim yapılmadı.";
    }
}

// Toplu İptal Etme İşlemi
async function seciliRandevulariIptalEt() {
    const seciliKutular = document.querySelectorAll('.randevu-checkbox:checked');
    if (seciliKutular.length === 0) return;

    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    let iptalEdilecekler = [];
    let suresiGecenler = 0;

    // Süre kurallarını tek tek denetle
    seciliKutular.forEach(kutu => {
        const randevuTarihi = new Date(kutu.getAttribute('data-tarih'));
        randevuTarihi.setHours(0, 0, 0, 0);
        
        const sonIptalTarihi = new Date(randevuTarihi);
        sonIptalTarihi.setDate(sonIptalTarihi.getDate() - 1);

        if (bugun > sonIptalTarihi) suresiGecenler++;
        else iptalEdilecekler.push(kutu.value);
    });

    if (suresiGecenler > 0) {
        alert(`Seçtiğiniz ${suresiGecenler} randevunun iptal süresi dolmuş (En geç 1 gün önce). Sadece kurala uyanlar iptal edilecektir.`);
    }

    if (iptalEdilecekler.length === 0) {
        alert("Seçtiğiniz randevular arasında iptal edilebilir durumda olan bulunamadı.");
        return;
    }

    if (!confirm(`Geçerli ${iptalEdilecekler.length} randevuyu iptal edip kotanızı geri almak istediğinize emin misiniz?`)) return;

    const btn = document.getElementById('btnTopluIptal');
    btn.innerText = "İptal Ediliyor...";
    btn.disabled = true;

    let hataVarMi = false;
    for (let id of iptalEdilecekler) {
        try {
            await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', id, { aktif: false });
        } catch (e) {
            hataVarMi = true;
        }
    }

    if (hataVarMi) alert("Bazı işlemler sırasında hata oluştu.");
    else alert("Seçili randevular başarıyla iptal edildi!");

    // Tabloyu ve matrisi yenile
    randevularimiGetir(); 
    if (document.getElementById('tarihSecim').value) {
        kotalariEkrandaGoster();
        if (document.getElementById('labSecim').value) matrisiGuncelle();
    }
}
// --- LABORATUVAR YÖNETİMİ ---

// Yeni Laboratuvar Ekleme
async function labEkle() {
    const labIsmi = document.getElementById('yeniLabIsmi').value.trim();
    if (!labIsmi) {
        alert("Lütfen bir laboratuvar adı girin!");
        return;
    }

    try {
        await databases.createDocument(
            '6a9c4942003cfdd06f0f', 
            '6a9c4a670034731ee85e', 
            ID.unique(), 
            { labIsmi: labIsmi }
        );
        alert("Laboratuvar başarıyla eklendi!");
        document.getElementById('yeniLabIsmi').value = ""; // Inputu temizle
        
        // Lab listelerini yenile
        adminLablariListele(); 
        if (typeof lablariGetir === "function") lablariGetir(); // Öğrenci matris filtrelerini yenile
    } catch (error) {
        alert("Lab eklenirken hata: " + error.message);
    }
}
async function labEkle() {
    const labIsmi = document.getElementById('yeniLabIsmi').value.trim();
    if (!labIsmi) {
        alert("Lütfen bir laboratuvar adı girin!");
        return;
    }

    try {
        await databases.createDocument(
            '6a9c4942003cfdd06f0f', '6a9c4a670034731ee85e', ID.unique(), { labIsmi: labIsmi }
        );
        alert("Laboratuvar başarıyla eklendi!");
        document.getElementById('yeniLabIsmi').value = ""; 
        
        adminLablariListele(); 
        if (typeof lablariGetir === "function") lablariGetir(); 
        
        // EKLENDİ: Sayfayı yenilemeye gerek kalmadan dropdown listesini de tazeler
        labYonetimEkraniniGetir(); 
    } catch (error) {
        alert("Lab eklenirken hata: " + error.message);
    }
}

// Admin Panelinde Labları Silme Butonlarıyla Listeleme
async function adminLablariListele() {
    const alan = document.getElementById('adminLabListesiAlani');
    if (!alan) return;

    try {
        const lablar = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4a670034731ee85e');
        
        if (lablar.documents.length === 0) {
            alan.innerHTML = "<p>Sistemde kayıtlı laboratuvar bulunmuyor.</p>";
            return;
        }

        let listeHTML = `<ul style="list-style: none; padding: 0; margin: 0;">`;
        lablar.documents.forEach(lab => {
            listeHTML += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #ffffff; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span style="font-weight: 500; color: #334155;">${lab.labIsmi}</span>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="labSil('${lab.$id}')">Sil</button>
            </li>`;
        });
        listeHTML += `</ul>`;
        alan.innerHTML = listeHTML;
    } catch (error) {
        alan.innerHTML = "<p>Lablar yüklenirken hata oluştu.</p>";
    }
}

// Laboratuvar Silme İşlemi
async function labSil(labId) {
    if (!confirm("Bu laboratuvarı kalıcı olarak silmek istediğinize emin misiniz? (Not: İçindeki cihazları manuel silmeniz gerekebilir)")) return;

    try {
        await databases.deleteDocument('6a9c4942003cfdd06f0f', '6a9c4a670034731ee85e', labId);
        alert("Laboratuvar silindi!");
        
        adminLablariListele();
        if (typeof lablariGetir === "function") lablariGetir();
    } catch (error) {
        alert("Silme işlemi başarısız: " + error.message);
    }
}

// --- CİHAZ YÖNETİMİ EKLEMESİ ---

// Cihaz Silme İşlemi
// Cihaz Silme İşlemi
async function cihazSil(cihazId) {
    if (!confirm("Bu cihazı kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
        await databases.deleteDocument('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', cihazId);
        alert("Cihaz başarıyla silindi!");
        
        // Tabloyu anında tazele
        labYonetimEkraniniGetir(); 
    } catch (error) {
        alert("Cihaz silinirken hata: " + error.message);
    }
}
// Seçilen laboratuvara ait cihazları Blok Kapatma menüsüne getirir
// 1. Admin Blok Kapatma Matrisini Çizme
async function adminBlokMatrisiCiz() {
    const secilenLabId = document.getElementById('adminBlokLabSecim').value;
    const secilenTarih = document.getElementById('adminBlokTarih').value;
    const matrisAlani = document.getElementById('adminBlokMatrisAlani');

    if (!secilenLabId || !secilenTarih) {
        matrisAlani.innerHTML = "<p style='font-size: 13px; color: #9a3412;'>Lütfen matrisi görmek için tarih ve laboratuvar seçin.</p>";
        return;
    }

    matrisAlani.innerHTML = "<p style='text-align: center; color: #c2410c;'>Matris Yükleniyor...</p>";

    try {
        const cihazlar = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4a8f001bfb0f7a8a', [Query.equal('labID', secilenLabId)]);
        if (cihazlar.documents.length === 0) {
            matrisAlani.innerHTML = "<p>Bu laboratuvarda cihaz bulunmuyor.</p>";
            return;
        }

        const randevular = await databases.listDocuments('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', [Query.equal('tarih', secilenTarih), Query.equal('aktif', true)]);

        let tabloHTML = `<table border="1" style="width: 100%; border-collapse: collapse; text-align: center; vertical-align: middle; background: white; font-size: 13px;">`;
        tabloHTML += `<tr style="background-color: #ea580c; color: white;">
            <th style="padding: 12px;">Saat / Cihaz</th>`;
        
        cihazlar.documents.forEach(cihaz => {
            tabloHTML += `<th style="padding: 12px;">${cihaz.cihazIsmi} <br><small style="color:#ffedd5;">(${cihaz.kullanimTipi})</small></th>`;
        });
        tabloHTML += `</tr>`;

        const saatler = ["10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"];

        saatler.forEach(saat => {
            tabloHTML += `<tr><td style="font-weight: bold; background-color: #ffedd5; padding: 12px; color: #9a3412;">${saat}</td>`;
            
            cihazlar.documents.forEach(cihaz => {
                if (cihaz.durum !== 'çalışıyor') {
                    tabloHTML += `<td style="background-color: #fca5a5; padding: 12px; font-weight:bold; color:#7f1d1d;">ARIZALI</td>`;
                    return;
                }

                let blokSaati = saat;
                if (cihaz.kullanimTipi === 'uzun') {
                    if (saat === '10:00-11:00') blokSaati = '10:00-13:00';
                    else if (saat === '13:00-14:00') blokSaati = '13:00-16:00';
                    else {
                        tabloHTML += `<td style="color: #cbd5e1; background-color: #f8fafc; padding: 12px;">- Blok İçi -</td>`;
                        return;
                    }
                }

                // Bu saatte Admin kaydı var mı?
                const yoneticiKapattiKaydi = randevular.documents.find(r => r.cihazId === cihaz.$id && r.saatAraligi === blokSaati && r.kullaniciId === 'ADMIN_KAPALI');
                
                // Bu saatte Öğrenci kaydı var mı?
                const ogrenciDoluluk = randevular.documents.filter(r => r.cihazId === cihaz.$id && r.saatAraligi === blokSaati && r.kullaniciId !== 'ADMIN_KAPALI').length;

                if (yoneticiKapattiKaydi) {
                    tabloHTML += `<td style="padding: 10px; background-color: #475569;">
                        <button class="btn btn-success" style="width:100%; padding: 8px;" onclick="adminBlokAc('${yoneticiKapattiKaydi.$id}')">Kilidi Aç 🔓</button>
                    </td>`;
                } else if (ogrenciDoluluk > 0) {
                    tabloHTML += `<td style="padding: 10px;">
                        <button class="btn" style="background-color: #cbd5e1; color:#475569; width:100%; padding: 8px; cursor:not-allowed;" disabled>Öğrenci Var (${ogrenciDoluluk})</button>
                    </td>`;
                } else {
                    tabloHTML += `<td style="padding: 10px;">
                        <button class="btn btn-danger" style="width:100%; padding: 8px;" onclick="adminBlokKapat('${cihaz.$id}', '${blokSaati}')">Kapat 🔒</button>
                    </td>`;
                }
            });
            tabloHTML += `</tr>`;
        });
        tabloHTML += `</table>`;
        matrisAlani.innerHTML = tabloHTML;

    } catch (error) {
        matrisAlani.innerHTML = "<p>Matris yüklenirken hata oluştu.</p>";
    }
}

// 2. Matris Üzerinden Butonla Kapatma İşlemi
async function adminBlokKapat(cihazId, saat) {
    const tarih = document.getElementById('adminBlokTarih').value;
    if(!confirm(`Seçili cihazın ${saat} dilimini tamamen kapatmak istediğinize emin misiniz?`)) return;

    try {
        await databases.createDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', ID.unique(), {
            cihazId: cihazId,
            kullaniciId: 'ADMIN_KAPALI',
            danismanId: 'sistem',
            tarih: tarih,
            saatAraligi: saat,
            danismanOnayi: 'onaylandi',
            gerceklesmeDurumu: 'kapali',
            aktif: true
        });
        adminBlokMatrisiCiz(); // Matrisi tazele
    } catch(e) { alert("Hata: " + e.message); }
}

// 3. Matris Üzerinden Butonla Açma İşlemi
async function adminBlokAc(randevuId) {
    if(!confirm("Kapatılmış bu bloğun kilidini açmak istediğinize emin misiniz?")) return;
    try {
        await databases.updateDocument('6a9c4942003cfdd06f0f', '6a9c4aba0033224cea70', randevuId, { aktif: false });
        adminBlokMatrisiCiz(); // Matrisi tazele
    } catch(e) { alert("Hata: " + e.message); }
}

let adminPaneliAcik = false;

function adminPaneliniGecisYap() {
    adminPaneliAcik = !adminPaneliAcik;
    const toggleBtn = document.getElementById('btnAdminToggle');
    const adminButonlari = document.querySelectorAll('.admin-menu-btn');

    if (adminPaneliAcik) {
        // Admin menülerini göster ve butonu kırmızı "Çıkış" butonuna çevir
        adminButonlari.forEach(btn => btn.classList.remove('hidden'));
        toggleBtn.innerHTML = "❌ Admin Panelinden Çık";
        toggleBtn.style.backgroundColor = "#ef4444"; 
    } else {
        // Admin menülerini gizle ve butonu mor "Geçiş" butonuna çevir
        adminButonlari.forEach(btn => btn.classList.add('hidden'));
        toggleBtn.innerHTML = "⚙️ Admin Paneline Geç";
        toggleBtn.style.backgroundColor = "#8b5cf6"; 

        // Yönetici paneli kapatınca onu standart ekrana geri at
        sekmeAc('randevuAlma'); 
    }
}