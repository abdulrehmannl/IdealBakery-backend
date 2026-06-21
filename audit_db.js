require('dotenv').config();
const mongoose = require('mongoose');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const models = require('fs').readdirSync('./models').filter(f => f.endsWith('.js'));
        for (let file of models) {
            const modelName = file.replace('.js', '');
            const Model = require('./models/' + file);
            const count = await Model.countDocuments();
            console.log(`${modelName}: ${count}`);
        }
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDB();
