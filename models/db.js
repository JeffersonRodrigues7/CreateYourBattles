const Sequelize = require("sequelize")

const sequelize = new Sequelize('animebattle', 'jefferson', 'jjj111',{
    host: 'localhost',
    dialect: 'mysql'
})

module.exports = {
    Sequelize: Sequelize,
    sequelize: sequelize
}