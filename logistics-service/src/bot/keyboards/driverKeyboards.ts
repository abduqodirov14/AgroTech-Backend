export function statusKeyboard(isActive: boolean) {
  return {
    keyboard: [
      [isActive ? '🟢 Ishga tayyorman (Available)' : '🔴 Dam olmoqdaman (Offline)'],
      ['📦 Yuklarim', '🗺️ Xaritani ochish'],
    ],
    resize_keyboard: true,
  };
}

export function shipmentRequestKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ Qabul qilaman', callback_data: 'shipment_accept' },
        { text: '❌ Rad etaman', callback_data: 'shipment_reject' },
      ],
      [{ text: '⏱️ 3 daqiqa kutish', callback_data: 'shipment_wait' }],
    ],
  };
}

export function shipmentActionKeyboard(status: string) {
  let rows: string[][] = [];

  if (status === 'assigned') {
    rows = [['🚚 Yukni oldim (Pick Up)'], ['📍 Joylashuvni yuborish']];
  } else if (status === 'in_transit') {
    rows = [['🛃 Bojxona (Customs)'], ['🏁 Yukni topshirdim (Delivered)'], ['📍 Joylashuvni yuborish']];
  } else if (status === 'arrived') {
    rows = [['🏁 Yukni topshirdim (Delivered)'], ['📍 Joylashuvni yuborish']];
  } else {
    rows = [['🟢 Ishga tayyorman', '🔴 Dam olmoqdaman'], ['📦 Yuklarim']];
  }

  return { keyboard: rows, resize_keyboard: true };
}

export function webAppKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🗺️ Xaritani ochish', web_app: { url: 'https://agrohub.uz/driver-webapp' } }],
      [{ text: '📦 Yuk ma’lumotlari', web_app: { url: 'https://agrohub.uz/driver-webapp' } }],
      [{ text: '❄️ Harorat grafigi', web_app: { url: 'https://agrohub.uz/driver-webapp' } }],
    ],
  };
}
