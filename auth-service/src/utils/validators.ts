/**
 * Telefon raqam format tekshirish
 * Format: +998XXXXXXXXX
 */
export const isValidPhone = (phone: string): boolean => {
  return /^\+998\d{9}$/.test(phone);
};

/**
 * 4 xonali kod format tekshirish
 */
export const isValidCode = (code: string): boolean => {
  return /^\d{4}$/.test(code);
};

/**
 * Telefon raqamni normalize qilish
 * Input: 901234567 yoki +998901234567
 * Output: +998901234567
 */
export const normalizePhone = (phone: string): string => {
  // Faqat raqamlarni qoldirish
  const digits = phone.replace(/\D/g, '');
  
  // Agar 998 bilan boshlansa
  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`;
  }
  
  // Agar 9 ta raqam bo'lsa (998 siz)
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  
  // Aks holda o'zgartirsiz qaytarish
  return phone;
};
