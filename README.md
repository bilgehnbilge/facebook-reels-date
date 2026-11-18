# Facebook Reels Date (Reels Tarih Gösterici)

**Facebook** ve **Instagram** Reels videolarında gizli olan **paylaşım tarihini** videonun üzerinde gösteren, Chrome ve Firefox uyumlu (Manifest V3) tarayıcı eklentisi.

*A Chrome/Firefox extension that shows the publish date on Facebook and Instagram Reels.*

## Özellikler

- Açık olan reel'in üzerinde bir rozet: **tarih · saat | göreli zaman** (ör. "4 gün önce")
- **Facebook:** `facebook.com/reel/...` sayfaları; rozet yazar adının altında
- **Instagram:** `instagram.com/reels/...`, `/reel/...` ve `/p/...` sayfaları; rozet videonun sol üstünde
- Tarih ve saat sayfanın/tarayıcının dilinde biçimlenir
- Üzerine gelince tam tarih ve saniye; tıklayınca ISO tarihini panoya kopyalar
- Reels arasında kaydırırken her reel için otomatik güncellenir
- Hiçbir veri dışarı gönderilmez; yalnızca facebook.com ve instagram.com üzerinde çalışır

## Kurulum

### Chrome / Edge / Brave
1. [Releases](../../releases/latest) sayfasından Chrome zip'ini indirip bir klasöre çıkar (ya da **Code → Download ZIP**).
2. `chrome://extensions` sayfasına git, sağ üstten **Geliştirici modu**nu aç.
3. **Paketlenmemiş öğe yükle** → klasörü (içinde `manifest.json` olan) seç.

### Firefox (128+)
- **Geçici:** `about:debugging#/runtime/this-firefox` → **Geçici Eklenti Yükle** → `.xpi` ya da `manifest.json` dosyasını seç. Firefox kapanınca kaldırılır.
- **Kalıcı:** Firefox Developer Edition / Nightly'de `about:config` → `xpinstall.signatures.required = false` yapıp `.xpi`'yi kur, ya da eklentiyi [addons.mozilla.org](https://addons.mozilla.org/developers/) üzerinden "unlisted" olarak imzalat.
- Rozet görünmezse: eklenti ayarları → **İzinler** → facebook.com / instagram.com erişimini aç.

## Nasıl çalışır?

### Facebook

Facebook paylaşım tarihini arayüzde göstermese de sayfa verisinde `creation_time` (Unix zaman damgası) olarak gönderir. Eklenti bu değeri ilgili videoya şu sırayla eşler:

1. Gönderinin base64 kodlu kimliği (`S:_I<sahip>:VK:<videoId>`) içindeki video ID'si — en güvenilir yol.
2. Bulunamazsa `creation_time`'a en yakın `"__typename":"Video"` düğümünün ID'si.

Veri şu kaynaklardan toplanır:

- Sayfa açılırken gömülü JSON script'leri
- Facebook'un GraphQL yanıtları (`inject.js`, sayfa bağlamında XHR/fetch'i dinler)
- Hiçbiri yoksa, `/reel/<id>` sayfasının HTML'i arka planda bir kez çekilir

### Instagram

1. **Anında, yaklaşık:** Adresteki kısa kod (ör. `DeXhDbAMRkr`) base64 benzeri bir alfabeyle medya ID'sine çözülür. ID'nin üst 41 biti, yüklemenin başladığı anı Instagram epoch'undan (1314220021721 ms) itibaren milisaniye olarak taşır. Rozet önce bu değeri `≈` ile gösterir (paylaşımdan genelde ~30 sn önce).
2. **Kesin:** Ardından Instagram'ın kendi web API'sinden (`/api/v1/media/<id>/info/`, oturum çerezinle) `taken_at` alınır ve rozet saniyesi kesin paylaşım zamanıyla güncellenir.

## Dosyalar

| Dosya | Görev |
|---|---|
| `manifest.json` | MV3 manifest (Chrome + Firefox) |
| `inject.js` | Facebook: sayfa bağlamında ağ yanıtlarını dinler, yedek çekmeyi yapar |
| `content.js` | Facebook: aktif reel'i bulur, tarihi eşler, rozeti çizer |
| `instagram.js` | Instagram: kısa kodu çözer, kesin zamanı API'den alır, rozeti çizer |
| `badge.css` | Rozet stili |

## Bilinen sınırlar

- Yalnızca tekil reel/gönderi adreslerinde çalışır; Facebook ana akışındaki ve Instagram ana sayfa akışındaki gönderilerde rozet çıkmaz (Instagram akışta zaten tarih gösteriyor).
- Instagram'da kesin zaman için giriş yapılmış olması gerekir; giriş yoksa yaklaşık (`≈`) zaman gösterilir.
- Facebook/Instagram veri yapısını değiştirirse eşleştirme mantığının güncellenmesi gerekebilir.

## Lisans

[MIT](LICENSE)
