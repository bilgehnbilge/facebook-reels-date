# Facebook Reels Date (Reels Tarih Gösterici)

Facebook Reels videolarında gizli olan **paylaşım tarihini** videonun üzerinde gösteren, Chrome ve Firefox uyumlu (Manifest V3) tarayıcı eklentisi.

*A Chrome/Firefox extension that shows the publish date on Facebook Reels.*

## Özellikler

- Açık olan reel'in üzerinde, yazar adının altında Facebook tarzında bir rozet: **tarih · saat | göreli zaman** (ör. "4 gün önce")
- Tarih ve saat tarayıcının dilinde biçimlenir
- Üzerine gelince tam tarih ve saniye; tıklayınca ISO tarihini panoya kopyalar
- Reels arasında kaydırırken her reel için otomatik güncellenir
- Hiçbir veri dışarı gönderilmez; yalnızca facebook.com üzerinde çalışır

## Kurulum

### Chrome / Edge / Brave
1. Bu depoyu indir (**Code → Download ZIP**) ve klasörü aç.
2. `chrome://extensions` sayfasına git, sağ üstten **Geliştirici modu**nu aç.
3. **Paketlenmemiş öğe yükle** → depodaki klasörü (içinde `manifest.json` olan) seç.

### Firefox (128+)
- **Geçici:** `about:debugging#/runtime/this-firefox` → **Geçici Eklenti Yükle** → `manifest.json` dosyasını seç. Firefox kapanınca kaldırılır.
- **Kalıcı:** Firefox Developer Edition / Nightly'de `about:config` → `xpinstall.signatures.required = false` yapıp klasörü zip'leyerek `.xpi` olarak kur, ya da eklentiyi [addons.mozilla.org](https://addons.mozilla.org/developers/) üzerinden "unlisted" olarak imzalat.
- Rozet görünmezse: eklenti ayarları → **İzinler** → facebook.com erişimini aç.

## Nasıl çalışır?

Facebook paylaşım tarihini arayüzde göstermese de sayfa verisinde `creation_time` (Unix zaman damgası) olarak gönderir. Eklenti bu değeri ilgili videoya şu sırayla eşler:

1. Gönderinin base64 kodlu kimliği (`S:_I<sahip>:VK:<videoId>`) içindeki video ID'si — en güvenilir yol.
2. Bulunamazsa `creation_time`'a en yakın `"__typename":"Video"` düğümünün ID'si.

Veri şu kaynaklardan toplanır:

- Sayfa açılırken gömülü JSON script'leri
- Facebook'un GraphQL yanıtları (`inject.js`, sayfa bağlamında XHR/fetch'i dinler)
- Hiçbiri yoksa, `/reel/<id>` sayfasının HTML'i arka planda bir kez çekilir

## Dosyalar

| Dosya | Görev |
|---|---|
| `manifest.json` | MV3 manifest (Chrome + Firefox) |
| `inject.js` | Sayfa bağlamında (MAIN world) ağ yanıtlarını dinler, yedek çekmeyi yapar |
| `content.js` | Aktif reel'i bulur, tarihi eşler, rozeti çizer |
| `badge.css` | Rozet stili |

## Bilinen sınırlar

- Yalnızca `facebook.com/reel/...` adresli sayfalarda çalışır; ana akıştaki gömülü reels'lerde rozet çıkmaz.
- Facebook veri yapısını değiştirirse eşleştirme mantığının güncellenmesi gerekebilir.

## Lisans

[MIT](LICENSE)
