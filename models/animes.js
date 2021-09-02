const db = require('./db')

const Animes = db.sequelize.define('animes', {
    name: {
        type: db.Sequelize.STRING
    },
    victories: {
        type: db.Sequelize.INTEGER
    },
    defeats: {
        type: db.Sequelize.INTEGER
    },
    battles: {
        type: db.Sequelize.INTEGER
    },
    winpercentage: {
        type: db.Sequelize.DOUBLE
    }
})

//Criar a tabela
//Animes.sync({force: true})

module.exports = Animes