const userRepository = require('../../repositories/user.repository');
const { generateToken } = require('../../utils/crypto');

class AuthService {
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    const token = generateToken();
    return { user, token };
  }
}

module.exports = new AuthService();
