import bcrypt from 'bcrypt';

export const hashDeviceSecret = async (plain: string, rounds = 10): Promise<string> => {
  return bcrypt.hash(plain, rounds);
};

export const compareDeviceSecret = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
