/**
 * createTestUsers.js — Seed internal staff accounts for testing
 * ==============================================================
 * Run with: node createTestUsers.js
 *
 * Creates 10 internal staff accounts (5 per branch) with hashed passwords.
 * Password for ALL users: 123456
 *
 * Users created:
 *   Branch 1: Manager, Staff1, Staff2, Delivery1, Delivery2
 *   Branch 2: Manager, Staff1, Staff2, Delivery1, Delivery2
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');
const Branch   = require('./models/Branch');

const PLAIN_PASSWORD = '123456';

async function main() {
    // ── Connect to MongoDB ──────────────────────────────────────────────────
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Fetch existing branches ─────────────────────────────────────────────
    const branches = await Branch.find({}).sort({ createdAt: 1 }).limit(2);

    if (branches.length < 2) {
        console.error(`❌ Need at least 2 branches in the database, but found ${branches.length}.`);
        console.error('   Please create branches first from the admin panel, then re-run this script.');
        await mongoose.disconnect();
        process.exit(1);
    }

    const branch1 = branches[0];
    const branch2 = branches[1];
    console.log(`📍 Branch 1: "${branch1.name}" (${branch1._id})`);
    console.log(`📍 Branch 2: "${branch2.name}" (${branch2._id})\n`);

    // ── Hash the shared password once ──────────────────────────────────────
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(PLAIN_PASSWORD, salt);

    // ── Define all test accounts ────────────────────────────────────────────
    const testUsers = [
        // ── Branch 1 ──
        { name: 'Manager Branch1',  phone: '03076936010', role: 'manager',  branch: branch1._id },
        { name: 'Staff1 Branch1',   phone: '03076936020', role: 'staff',    branch: branch1._id },
        { name: 'Staff2 Branch1',   phone: '03076936030', role: 'staff',    branch: branch1._id },
        { name: 'Delivery1 Branch1',phone: '03076936040', role: 'delivery', branch: branch1._id },
        { name: 'Delivery2 Branch1',phone: '03076936050', role: 'delivery', branch: branch1._id },

        // ── Branch 2 ──
        { name: 'Manager Branch2',  phone: '03076936060', role: 'manager',  branch: branch2._id },
        { name: 'Staff1 Branch2',   phone: '03076936070', role: 'staff',    branch: branch2._id },
        { name: 'Staff2 Branch2',   phone: '03076936080', role: 'staff',    branch: branch2._id },
        { name: 'Delivery1 Branch2',phone: '03076936090', role: 'delivery', branch: branch2._id },
        { name: 'Delivery2 Branch2',phone: '03076936100', role: 'delivery', branch: branch2._id },
    ];

    // ── Insert or skip each user ────────────────────────────────────────────
    console.log('👤 Creating test users...\n');
    const results = [];

    for (const u of testUsers) {
        try {
            // Skip if phone already exists
            const existing = await User.findOne({ phone: u.phone });
            if (existing) {
                console.log(`⚠️  SKIPPED  — ${u.name} (${u.phone}) already exists`);
                results.push({ ...u, status: 'skipped' });
                continue;
            }

            await User.create({
                name:         u.name,
                phone:        u.phone,
                password:     hashed,
                role:         u.role,
                branch:       u.branch,
                authProvider: 'internal',
                isActive:     true,
            });

            console.log(`✅ CREATED  — ${u.name} (${u.phone})  role: ${u.role}`);
            results.push({ ...u, status: 'created' });

        } catch (err) {
            console.log(`❌ FAILED   — ${u.name} (${u.phone}): ${err.message}`);
            results.push({ ...u, status: 'failed', error: err.message });
        }
    }

    // ── Print credentials summary ────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('  CREDENTIALS SUMMARY');
    console.log('═'.repeat(70));
    console.log(`  Password for ALL accounts: ${PLAIN_PASSWORD}`);
    console.log('─'.repeat(70));
    console.log(`  ${'Name'.padEnd(22)} ${'Phone'.padEnd(15)} ${'Role'.padEnd(10)} Branch`);
    console.log('─'.repeat(70));

    for (const r of results) {
        const branchName = r.branch?.toString() === branch1._id.toString()
            ? branch1.name
            : branch2.name;
        const statusIcon = r.status === 'created' ? '✅' : r.status === 'skipped' ? '⚠️ ' : '❌';
        console.log(`  ${statusIcon} ${r.name.padEnd(20)} ${r.phone.padEnd(15)} ${r.role.padEnd(10)} ${branchName}`);
    }

    console.log('─'.repeat(70));

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed  = results.filter(r => r.status === 'failed').length;
    console.log(`\n  Created: ${created}  |  Skipped (already existed): ${skipped}  |  Failed: ${failed}`);
    console.log('═'.repeat(70) + '\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB. Done!\n');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
