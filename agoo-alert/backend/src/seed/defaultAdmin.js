const User = require('../models/User');

async function ensureDefaultAdmin() {
  try {
    const enabled = String(process.env.SEED_ADMIN || '').toLowerCase() === 'true';
    if (!enabled) return;

    const email = (process.env.DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || '';
    const displayName = (process.env.DEFAULT_ADMIN_DISPLAY_NAME || 'Admin').trim();

    if (!email || !password) {
      console.warn('⚠️ SEED_ADMIN=true mais DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD manquants');
      return;
    }

    const existingPrivileged = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
    if (existingPrivileged) return;

    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      existingByEmail.role = 'admin';
      existingByEmail.isActive = true;
      existingByEmail.isBanned = false;
      await existingByEmail.save();
      console.log(`✅ Compte admin activé: ${email}`);
      return;
    }

    const user = new User({
      email,
      password,
      displayName,
      role: 'admin',
      isActive: true,
      isBanned: false,
    });

    await user.save();
    console.log(`✅ Compte admin créé: ${email}`);
  } catch (error) {
    console.error('❌ Erreur seed admin:', error);
  }
}

module.exports = { ensureDefaultAdmin };
