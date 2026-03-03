const User = require('../../../../shared/models/User');

const ensureDefaultAdmin = async () => {
  try {
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '+22890000000';
    const existing = await User.findOne({ phone: adminPhone, role: 'admin' });

    if (!existing) {
      const admin = new User({
        phone: adminPhone,
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminAgoo2024!',
        firstName: process.env.DEFAULT_ADMIN_FIRSTNAME || 'Admin',
        lastName: process.env.DEFAULT_ADMIN_LASTNAME || 'Agoo',
        accountType: 'individual',
        role: 'admin',
        verificationStatus: 'approved',
        isActive: true,
      });
      await admin.save();
      console.log(`👑 Compte admin par défaut créé: ${adminPhone}`);
    } else {
      console.log('👑 Compte admin existant trouvé');
    }
  } catch (error) {
    console.error('Erreur création admin par défaut:', error);
  }
};

module.exports = { ensureDefaultAdmin };
