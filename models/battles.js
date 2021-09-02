const db = require('./db')

const Battles = db.sequelize.define('battles', {
    battleNumber: {
        type: db.Sequelize.INTEGER
    },
    anime1: {
        type: db.Sequelize.STRING
    },
    anime2: {
        type: db.Sequelize.STRING
    },
    winner: {
        type: db.Sequelize.STRING
    },
    loser: {
        type: db.Sequelize.STRING
    },
    done: {
        type: db.Sequelize.BOOLEAN
    }
})

//Criar a tabela
//Battles.sync({force: true})

module.exports = Battles