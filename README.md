# 카운터 계산기 · Counter POS

음식점 카운터용 직원 계산 앱 (태블릿/휴대폰). 오프라인 PWA — 빌드 도구 없이 동작합니다.

## 실행
```bash
python3 -m http.server 5178
```
→ http://localhost:5178 (Wake Lock·Service Worker는 https 또는 localhost에서만 동작)

## 구조
| 파일 | 역할 |
|---|---|
| `js/app.js` | 화면(계산/메뉴/매출/설정), 프로필, 결제, 백업 |
| `js/db.js` | IndexedDB — 모든 변경을 즉시 커밋. 판매+장바구니 비우기는 한 트랜잭션 |
| `js/i18n.js` | 한국어/영어 문자열 (언어 추가: 블록 복사 후 `LANGS`에 등록) |
| `js/chart.js` | 매출 막대 그래프 (SVG, 외부 라이브러리 없음) |
| `js/wake.js` | 화면 켜짐 유지 (Screen Wake Lock API) |
| `sw.js` | 오프라인 캐시 (network-first) |

## 데이터 모델 (IndexedDB `counter-pos`)
- `profiles` — `{id, name, settings:{lang, currency, fontScale, tileSize, keepAwake}}`
- `menu` — `{id, profileId, number, name, price, desc, emoji, image(dataURL), color, active}`
- `orders` — `{id, profileId, createdAt, items:[{menuId, number, name, price, qty}], total, method, voided}`
- `kv` — `activeProfile`, `lastView`, `cart:<profileId>`, `draft:<profileId>` (작성 중인 메뉴),
  `prep:<profileId>` (준비 목록 `[{orderId, ticket, createdAt, items:[{name, qty, done}]}]`),
  `ticket:<profileId>` (일일 주문 번호 `{day, n}` — 매일 #1부터)

주문에는 판매 당시의 이름·가격이 복사되므로, 메뉴를 고치거나 지워도 과거 매출은 그대로입니다.

## 향후 작업
1. **Google Play 출시** — 이 PWA를 https로 호스팅 → [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)으로 TWA(.aab) 생성 → Play Console 업로드. `/.well-known/assetlinks.json` 필요.
2. **Google 계정 동기화** — Firebase Auth(Google 로그인) + Firestore. 위 모델을 그대로 컬렉션으로 옮기고, 오프라인 우선 유지(Firestore 오프라인 캐시). 사진은 Cloud Storage로.
