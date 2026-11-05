// Translations. To add a language: copy the `en` block, translate, and add it to LANGS.
const dict = {
  ko: {
    appName: '카운터 계산기',
    'nav.register': '계산', 'nav.prep': '준비', 'nav.menu': '메뉴', 'nav.sales': '매출', 'nav.settings': '설정',
    'font.smaller': '글자 작게', 'font.bigger': '글자 크게',
    'wake.on': '화면 켜짐 유지 중',

    'reg.empty': '아직 메뉴가 없습니다.', 'reg.addMenu': '메뉴 등록하러 가기',
    'reg.byNumber': '번호로 추가',
    'cart.title': '주문 내역', 'cart.empty': '메뉴를 눌러서 추가하세요',
    'cart.items': '{n}개', 'cart.total': '합계', 'cart.clear': '전체 취소',
    'cart.clearConfirm': '주문 내역을 모두 지울까요?', 'cart.pay': '결제하기',
    'cart.show': '주문 보기', 'cart.hide': '접기',
    'cart.remove': '빼기', 'cart.add': '더하기',

    'np.title': '메뉴 번호 입력', 'np.notFound': '없는 번호입니다', 'np.add': '추가',
    'np.hint': '번호를 누르세요',

    'pay.title': '결제', 'pay.total': '받을 금액', 'pay.card': '카드', 'pay.cash': '현금',
    'pay.other': '기타', 'pay.received': '받은 돈', 'pay.change': '거스름돈',
    'pay.short': '{amount} 부족', 'pay.exact': '딱 맞게', 'pay.reset': '다시', 'pay.type': '직접 입력', 'pay.typeLabel': '받은 금액 입력',
    'pay.done': '결제 완료', 'pay.back': '뒤로',
    'sale.done': '판매 완료 · #{ticket} · {amount}', 'sale.undo': '되돌리기', 'sale.undone': '판매를 취소했습니다',

    'prep.title': '준비 중인 주문', 'prep.empty': '준비할 주문이 없습니다',
    'prep.done': '준비 완료 · 목록에서 빼기', 'prep.remove': '목록에서 빼기',
    'prep.removeConfirm': '아직 다 준비되지 않았습니다.\n#{ticket} 주문을 목록에서 뺄까요?\n(매출 기록은 그대로 남습니다)',
    'prep.removed': '#{ticket} 주문을 목록에서 뺐습니다',
    'prep.justNow': '방금', 'prep.ago': '{n}분 전',

    'menu.title': '메뉴 관리', 'menu.add': '메뉴 추가', 'menu.edit': '메뉴 수정',
    'menu.number': '번호', 'menu.name': '이름', 'menu.price': '가격', 'menu.desc': '짧은 설명',
    'menu.descPh': '예: 매운맛, 2인분', 'menu.icon': '아이콘 / 사진', 'menu.emoji': '아이콘',
    'menu.photo': '사진', 'menu.choosePhoto': '사진 선택 / 촬영', 'menu.removePhoto': '사진 지우기',
    'menu.color': '칸 색상', 'menu.onSale': '판매 중', 'menu.soldOut': '품절 / 숨김',
    'menu.save': '저장', 'menu.cancel': '취소', 'menu.delete': '삭제',
    'menu.deleteConfirm': '"{name}" 메뉴를 삭제할까요?\n(지난 매출 기록은 남아 있습니다)',
    'menu.nameRequired': '이름을 입력하세요', 'menu.priceInvalid': '가격을 올바르게 입력하세요',
    'menu.numberDup': '{n}번은 이미 "{name}"에 쓰이고 있습니다',
    'menu.empty': '등록된 메뉴가 없습니다. "메뉴 추가"를 눌러 시작하세요.',
    'menu.draftRestored': '작성 중이던 내용을 불러왔습니다',

    'sales.day': '일별', 'sales.week': '주별', 'sales.month': '월별', 'sales.today': '오늘',
    'sales.prev': '이전', 'sales.next': '다음',
    'sales.revenue': '총 매출', 'sales.orders': '주문 수', 'sales.avg': '평균 주문 금액',
    'sales.byMethod': '결제 수단', 'sales.chartDay': '시간대별 매출', 'sales.chartWeek': '요일별 매출',
    'sales.chartMonth': '날짜별 매출', 'sales.byMenu': '메뉴별 매출',
    'sales.col.menu': '메뉴', 'sales.col.qty': '수량', 'sales.col.revenue': '매출', 'sales.col.share': '비율',
    'sales.noData': '이 기간에는 판매 기록이 없습니다.',
    'sales.orderList': '주문 기록', 'sales.void': '취소', 'sales.voided': '취소됨',
    'sales.voidConfirm': '이 주문을 취소할까요? 매출에서 빠집니다.',
    'sales.export': 'CSV 내보내기 (엑셀)', 'sales.hour': '{h}시',
    'sales.showAll': '전체 보기 ({n}건)',

    'set.store': '가게', 'set.storeName': '가게 이름', 'set.currency': '통화',
    'set.currencyNote': '통화를 바꿔도 메뉴 가격은 바뀌지 않습니다.',
    'set.display': '화면', 'set.lang': '언어', 'set.fontSize': '글자 크기',
    'set.fontPreview': '김밥 3,000원 — 미리보기', 'set.tileSize': '메뉴 칸 크기',
    'set.tile.sm': '작게', 'set.tile.md': '보통', 'set.tile.lg': '크게',
    'set.keepAwake': '화면 꺼지지 않게', 'set.keepAwakeNote': '계산 중에 화면이 꺼지지 않습니다.',
    'set.keepAwakeUnsupported': '이 기기/브라우저는 화면 켜짐 유지를 지원하지 않습니다.',
    'set.fullscreen': '전체 화면으로 보기',
    'set.prepList': '준비 목록 사용', 'set.prepListNote': '결제한 주문이 "준비" 탭에 올라가고, 메뉴별로 체크할 수 있습니다.',
    'set.profiles': '가게 프로필', 'set.profilesNote': '프로필마다 메뉴, 매출, 설정이 따로 저장됩니다.',
    'set.current': '사용 중', 'set.use': '사용', 'set.rename': '이름 변경', 'set.delete': '삭제',
    'set.addProfile': '새 가게 추가', 'set.newProfileName': '새 가게 이름',
    'set.copyMenu': '현재 가게의 메뉴를 복사할까요?',
    'set.deleteProfileConfirm': '"{name}" 가게와 모든 메뉴·매출 기록을 삭제할까요?\n되돌릴 수 없습니다.',
    'set.cantDeleteLast': '마지막 가게는 삭제할 수 없습니다.',
    'set.data': '데이터', 'set.autosave': '모든 변경 사항은 기기에 즉시 자동 저장됩니다.',
    'set.persisted': '저장소 보호: 켜짐 (브라우저가 자동으로 지우지 않음)',
    'set.notPersisted': '저장소 보호: 꺼짐 — 백업을 자주 해 두세요.',
    'set.export': '백업 파일 저장', 'set.import': '백업 불러오기',
    'set.importConfirm': '백업을 불러올까요? 같은 항목은 백업 내용으로 덮어씁니다.',
    'set.importDone': '백업을 불러왔습니다', 'set.importFail': '백업 파일을 읽을 수 없습니다',
    'set.cloud': 'Google 계정 동기화', 'set.cloudSoon': '준비 중 — 곧 지원 예정',

    'profile.title': '가게 선택',
    'common.ok': '확인', 'common.cancel': '취소', 'common.close': '닫기',
    'error.generic': '문제가 생겼지만 데이터는 안전하게 저장되어 있습니다.',
    'default.store': '우리 가게',
  },
  en: {
    appName: 'Counter POS',
    'nav.register': 'Register', 'nav.prep': 'Preparing', 'nav.menu': 'Menu', 'nav.sales': 'Sales', 'nav.settings': 'Settings',
    'font.smaller': 'Smaller text', 'font.bigger': 'Bigger text',
    'wake.on': 'Screen kept on',

    'reg.empty': 'No menu items yet.', 'reg.addMenu': 'Add menu items',
    'reg.byNumber': 'Add by number',
    'cart.title': 'Order', 'cart.empty': 'Tap a menu item to add it',
    'cart.items': '{n} items', 'cart.total': 'Total', 'cart.clear': 'Clear all',
    'cart.clearConfirm': 'Clear the whole order?', 'cart.pay': 'Pay',
    'cart.show': 'Show order', 'cart.hide': 'Hide',
    'cart.remove': 'Remove one', 'cart.add': 'Add one',

    'np.title': 'Enter menu number', 'np.notFound': 'No item with that number', 'np.add': 'Add',
    'np.hint': 'Type a number',

    'pay.title': 'Payment', 'pay.total': 'Amount due', 'pay.card': 'Card', 'pay.cash': 'Cash',
    'pay.other': 'Other', 'pay.received': 'Received', 'pay.change': 'Change',
    'pay.short': '{amount} short', 'pay.exact': 'Exact', 'pay.reset': 'Reset', 'pay.type': 'Type amount', 'pay.typeLabel': 'Amount received',
    'pay.done': 'Complete sale', 'pay.back': 'Back',
    'sale.done': 'Sale complete · #{ticket} · {amount}', 'sale.undo': 'Undo', 'sale.undone': 'Sale undone',

    'prep.title': 'Orders in preparation', 'prep.empty': 'Nothing to prepare',
    'prep.done': 'Ready · remove from list', 'prep.remove': 'Remove from list',
    'prep.removeConfirm': 'This order is not fully prepared.\nRemove #{ticket} from the list?\n(Sales records are kept)',
    'prep.removed': 'Removed #{ticket} from the list',
    'prep.justNow': 'just now', 'prep.ago': '{n} min ago',

    'menu.title': 'Menu', 'menu.add': 'Add item', 'menu.edit': 'Edit item',
    'menu.number': 'No.', 'menu.name': 'Name', 'menu.price': 'Price', 'menu.desc': 'Short description',
    'menu.descPh': 'e.g. spicy, for two', 'menu.icon': 'Icon / photo', 'menu.emoji': 'Icon',
    'menu.photo': 'Photo', 'menu.choosePhoto': 'Choose / take photo', 'menu.removePhoto': 'Remove photo',
    'menu.color': 'Tile color', 'menu.onSale': 'On sale', 'menu.soldOut': 'Sold out / hidden',
    'menu.save': 'Save', 'menu.cancel': 'Cancel', 'menu.delete': 'Delete',
    'menu.deleteConfirm': 'Delete "{name}"?\n(Past sales records are kept)',
    'menu.nameRequired': 'Enter a name', 'menu.priceInvalid': 'Enter a valid price',
    'menu.numberDup': 'No. {n} is already used by "{name}"',
    'menu.empty': 'No menu items. Tap "Add item" to start.',
    'menu.draftRestored': 'Restored your unsaved changes',

    'sales.day': 'Day', 'sales.week': 'Week', 'sales.month': 'Month', 'sales.today': 'Today',
    'sales.prev': 'Previous', 'sales.next': 'Next',
    'sales.revenue': 'Revenue', 'sales.orders': 'Orders', 'sales.avg': 'Average order',
    'sales.byMethod': 'Payment method', 'sales.chartDay': 'Revenue by hour', 'sales.chartWeek': 'Revenue by weekday',
    'sales.chartMonth': 'Revenue by day', 'sales.byMenu': 'Revenue by item',
    'sales.col.menu': 'Item', 'sales.col.qty': 'Qty', 'sales.col.revenue': 'Revenue', 'sales.col.share': 'Share',
    'sales.noData': 'No sales in this period.',
    'sales.orderList': 'Orders', 'sales.void': 'Void', 'sales.voided': 'Voided',
    'sales.voidConfirm': 'Void this order? It will be removed from revenue.',
    'sales.export': 'Export CSV (Excel)', 'sales.hour': '{h}h',
    'sales.showAll': 'Show all ({n})',

    'set.store': 'Store', 'set.storeName': 'Store name', 'set.currency': 'Currency',
    'set.currencyNote': 'Changing currency does not convert menu prices.',
    'set.display': 'Display', 'set.lang': 'Language', 'set.fontSize': 'Text size',
    'set.fontPreview': 'Gimbap $3.00 — preview', 'set.tileSize': 'Menu tile size',
    'set.tile.sm': 'Small', 'set.tile.md': 'Medium', 'set.tile.lg': 'Large',
    'set.keepAwake': 'Keep screen on', 'set.keepAwakeNote': 'The screen will not turn off while the app is open.',
    'set.keepAwakeUnsupported': 'This device/browser does not support keeping the screen on.',
    'set.fullscreen': 'Full screen',
    'set.prepList': 'Use preparing list', 'set.prepListNote': 'Paid orders appear in the "Preparing" tab with a checklist per item.',
    'set.profiles': 'Store profiles', 'set.profilesNote': 'Each profile has its own menu, sales and settings.',
    'set.current': 'In use', 'set.use': 'Use', 'set.rename': 'Rename', 'set.delete': 'Delete',
    'set.addProfile': 'Add store', 'set.newProfileName': 'New store name',
    'set.copyMenu': 'Copy the current store\'s menu?',
    'set.deleteProfileConfirm': 'Delete "{name}" and all its menu and sales data?\nThis cannot be undone.',
    'set.cantDeleteLast': 'You cannot delete the last store.',
    'set.data': 'Data', 'set.autosave': 'Every change is saved to this device instantly.',
    'set.persisted': 'Storage protection: on (browser won\'t clear it automatically)',
    'set.notPersisted': 'Storage protection: off — make backups often.',
    'set.export': 'Save backup file', 'set.import': 'Load backup',
    'set.importConfirm': 'Load this backup? Matching records will be overwritten.',
    'set.importDone': 'Backup loaded', 'set.importFail': 'Could not read the backup file',
    'set.cloud': 'Google account sync', 'set.cloudSoon': 'Coming soon',

    'profile.title': 'Choose store',
    'common.ok': 'OK', 'common.cancel': 'Cancel', 'common.close': 'Close',
    'error.generic': 'Something went wrong, but your data is safely saved.',
    'default.store': 'My Store',
  },
};

export const LANGS = [
  { code: 'ko', label: '한국어', locale: 'ko-KR' },
  { code: 'en', label: 'English', locale: 'en-US' },
];

let lang = 'ko';

export function setLang(code) {
  lang = dict[code] ? code : 'en';
  document.documentElement.lang = lang;
}
export const getLang = () => lang;
export const locale = () => LANGS.find(l => l.code === lang).locale;

export function t(key, vars) {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

export function detectLang() {
  return (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
