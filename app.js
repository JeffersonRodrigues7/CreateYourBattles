const express = require("express");
const app = express();
const handlebars = require("express-handlebars");
const bodyParser = require("body-parser")
const moment = require('moment')
const animes = require("./models/animes")
const battles = require("./models/battles")
const db = require('./models/db')

app.engine('handlebars', handlebars({
    defaultLayout: 'main',
    helpers: {
        getIndex: (index) => {
            return index+1;
        },
        getPercentage: (pct) => {
            return (pct * 100).toFixed(2);
        },
        getPosition: (animesRanking, animeName) => {
            var i;
            for(i = 0; i<animesRanking.length; i++){
                if(animesRanking[i].name == animeName){
                    break;
                }
            }
            return ++i;
        },
        formatDate: (date) => {
            return moment(date).format('Do MMMM YYYY, h:mm:ss a')
        }
    }
}))
app.set('view engine', 'handlebars')

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

//Rotas
app.get('/', function(req, res){

    Promise.all([ 
        db.sequelize.query("SELECT * FROM animes ORDER BY winpercentage DESC, victories DESC, defeats ASC, name ASC",//Retorna Ranking
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

        db.sequelize.query("SELECT * FROM battles WHERE done = 0 ORDER BY RAND() LIMIT 1",//Retorna batalha atual
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

        db.sequelize.query("SELECT * FROM battles WHERE done = 1 ORDER BY battleNumber DESC",//Retorna batalhas passadas
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

        db.sequelize.query("SELECT * FROM animes ORDER BY name ASC",//Retorna nome dos animes em ordem alfabética(Vou usar na parte do delete)
        { 
            type: db.sequelize.QueryTypes.SELECT 
        })
    ]).then((data) => {
        var battle = data[1][0]//Retorna o objeto com a batalha atual

        if(battle != undefined){//se ainda existirem batalhas entramos aqui
            Promise.all([ 
                db.sequelize.query("SELECT * FROM animes WHERE name = :animeName",//Retorna dados do primeiro anime
                { 
                    replacements: { animeName: battle.anime1 },
                    type: db.sequelize.QueryTypes.SELECT 
                }),
                db.sequelize.query("SELECT * FROM animes WHERE name = :animeName",//Retorna dados do segundo anime
                { 
                    replacements: { animeName: battle.anime2 },
                    type: db.sequelize.QueryTypes.SELECT 
                })
            ]).then((dataT) => {//dataT -> Dados dos animes
                res.render('content', {animes: data[0], orderAnime: data[3], battles: data[1], anime1Data: dataT[0], anime2Data: dataT[1], pastBattles: data[2]});//data[2] são as batalhas passadas
            });
        }else{
            res.render('content', {animes: data[0], battles: data[1], pastBattles: data[2], orderAnime: data[3]});
        }

    });
});

app.post('/addAnimes', function(req, res){
    var list = req.body.animes;
    var numberOption = req.body.numberOption;

    list = list
        .split("\n")        //Coloca texto em um array
        .map(str =>         //Passando pelo array de animes
            str.substr(numberOption)   //Removemos os dois primeiros caracteres para cada elemento da lista
        )
    list = list.filter(e => String(e).trim());//Removendo string vazias 

    var newList = [];//Vai armazenar apenas registros unicos, eliminando duplicatas
    var flag;//Quando for true significa que temos uma duplicata
    for(var i = 0; i < list.length; i++){
        flag = false;

        for(var j = 0; j < newList.length; j++){
            if(list[i].trim() == newList[j].trim()){//Achamos uma duplicata
                flag = true;
                break;
            }
        }

        if(!flag){//Se não há duplicata adicionamos o anime na nova lista
            newList.push(list[i])
        }
    }
    list = newList;

    Promise.all([//Primeiro preciso eliminar a lista anterior
        db.sequelize.query('truncate animes',
        {
            type: db.sequelize.QueryTypes.DELETE
        }),
        db.sequelize.query('truncate battles',
        {
            type: db.sequelize.QueryTypes.DELETE
        })
        
    ]).then(() => {
        for(var i = 0; i<list.length; i++){
            animes.create({//Deveria ter feito com query mas fiquei com preguiça de mudar
                name: list[i].trim(),
                victories: 0,
                defeats: 0,
                battles: 0,
                winpercentage: 0.00
            }).then(function(){ }).catch(function(erro){ res.send("Erro ao cadastrar anime" + erro) })
            
            for(var j = i+1; j<list.length; j++){
                battles.create({
                    anime1: list[i].trim(),
                    anime2: list[j].trim(),
                    winner: "",
                    loser: "",
                    done: false
                }).then(function(){ }).catch(function(erro){ res.send("Erro ao cadastrar batalha" + erro) })
            }
        }
    }).then(() => { 
        res.redirect('/'); 
    });
});

app.post('/incrementAnimes', function(req, res){
    var list = req.body.animes;
    var numberOption = req.body.numberOption;

    list = list
    .split("\n")        //Coloca texto em um array
    .map(str =>         //Passando pelo array de animes
        str.substr(numberOption)   //Removemos os dois primeiros caracteres para cada elemento da lista
    )
    list = list.filter(e => String(e).trim());//Removendo string vazias 

    var newList = [];//Vai armazenar apenas registros unicos, eliminando duplicatas
    var flag;//Quando for true significa que temos uma duplicata
    for(var i = 0; i < list.length; i++){
        flag = false;

        for(var j = 0; j < newList.length; j++){
            if(list[i].trim() == newList[j].trim()){//Achamos uma duplicata
                flag = true;
                break;
            }
        }

        if(!flag){//Se não há duplicata adicionamos o anime na nova lista
            newList.push(list[i])
        }
    }
    list = newList;


    Promise.all([//Pegando os animes que já existem primeiro
        db.sequelize.query("SELECT * FROM animes",//Retorna dados do primeiro anime
        { 
            type: db.sequelize.QueryTypes.SELECT 
        })
        
    ]).then((data) => {
        var oldAnimes = data[0]

        var newList = [];//Vai armazenar apenas registros unicos, eliminando duplicatas
        var flag;//Quando for true significa que temos uma duplicata

        for(var i = 0; i < list.length; i++){
            flag = false;

            for(var j = 0; j < oldAnimes.length; j++){
                if(list[i].trim() == oldAnimes[j].name.trim()){//Achamos uma duplicata
                    flag = true;
                    break;
                }
            }

            if(!flag){//Se não há duplicata adicionamos o anime na nova lista
                newList.push(list[i])
            }
        }

        list = newList;

        for(var i = 0; i<list.length; i++){
            animes.create({//Deveria ter feito com query mas fiquei com preguiça de mudar
                name: list[i].trim(),
                victories: 0,
                defeats: 0,
                battles: 0,
                winpercentage: 0.00
            }).then(function(){ }).catch(function(erro){ res.send("Erro ao cadastrar anime" + erro) })
            
            for(var j = i+1; j<list.length; j++){//Adicionando batalha entre os animes novos
                battles.create({
                    anime1: list[i].trim(),
                    anime2: list[j].trim(),
                    winner: "",
                    loser: "",
                    done: false
                }).then(function(){ }).catch(function(erro){ res.send("Erro ao cadastrar batalha" + erro) })
            }

            oldAnimes.forEach(element => {//Adicionando batalha com animes antigos
                battles.create({
                    anime1: list[i].trim(),
                    anime2: element.name.trim(),
                    winner: "",
                    loser: "",
                    done: false
                }).then(function(){ }).catch(function(erro){ res.send("Erro ao cadastrar batalha" + erro) })
            });

        }
    }).then(() => { 
        res.redirect('/'); 
    });
});   

app.post('/endBattle', function(req, res){
    var battleId = req.body.battleID;
    var animeWinner = req.body.animeWinner.trim();
    var animeLoser = req.body.animeLoser.trim();

    Promise.all([ 
        //Query para anime vencedor
        db.sequelize.query('UPDATE animes SET victories = victories + 1, battles = battles + 1, winpercentage = victories/battles  WHERE name = :animeName',
        {
            replacements: { animeName: animeWinner },
            type: db.sequelize.QueryTypes.INSERT
        }),

        //Query para anime perdedor
        db.sequelize.query('UPDATE animes SET defeats = defeats + 1, battles = battles + 1, winpercentage = victories/battles  WHERE name = :animeName',
        {
            replacements: { animeName: animeLoser },
            type: db.sequelize.QueryTypes.INSERT
        }),

        //Query para atualizar resultado da batalha
        db.sequelize.query('UPDATE battles SET done = 1, winner = :animeWin, loser = :animeLose WHERE id = :batid',
        {
            replacements: { animeWin: animeWinner, animeLose: animeLoser, batid: battleId},
            type: db.sequelize.QueryTypes.INSERT
        }),

        //Query para pegar o número de batalhas que ocorreram até agora
        db.sequelize.query('Select count(*) from battles where done = 1',
        {
            type: db.sequelize.QueryTypes.SELECT
        })

    ]).then((data) => {
        var number = data[3][0]['count(*)'] //pega quantidade de batalhas que existiram até agora
        number++

        Promise.all([ 
            //Query para atualizar o número da batalha atual
            db.sequelize.query('UPDATE battles SET battleNumber = :newBattleNumber WHERE id = :battleIDNumber',
            {
                replacements: { newBattleNumber: number,  battleIDNumber: battleId },
                type: db.sequelize.QueryTypes.INSERT
            })
        ]).then((data) => {
            res.redirect('/');
        });
    });

});

app.post('/returnBattle', function(req, res){//Primeiro limpa a batalha atual e pega a anterior

    Promise.all([ 
        //Retorna Ranking (Vou usar para caso não haja batalha anterior)
        db.sequelize.query("SELECT * FROM animes ORDER BY winpercentage DESC, victories DESC, defeats ASC, name ASC",
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

        //Retorna batalhas passadas (Vou usar para caso não haja batalha anterior)
        db.sequelize.query("SELECT * FROM battles WHERE done = 1 ORDER BY battleNumber DESC",
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

        //Retorna batalha anterior
        db.sequelize.query("SELECT * FROM battles WHERE done = 1 ORDER BY battleNumber DESC LIMIT 1",
        { 
            type: db.sequelize.QueryTypes.SELECT 
        }),

    ]).then((data) => {
        var battle = data[2][0]//Retorna o objeto com a batalha atual

        if(battle != undefined){//se ainda existirem batalhas entramos aqui, caso contrário ele redireciona para o ("/")
            Promise.all([

                //Query para atualizar anime vencedor
                db.sequelize.query('UPDATE animes SET victories = victories - 1, battles = battles - 1, winpercentage = victories/battles WHERE name = :animeName',
                {
                    replacements: { animeName: battle.winner },
                    type: db.sequelize.QueryTypes.INSERT
                }),

                //Query para atualizar anime perdedor
                db.sequelize.query('UPDATE animes SET defeats = defeats - 1, battles = battles - 1, winpercentage = victories/battles  WHERE name = :animeName',
                {
                    replacements: { animeName: battle.loser },
                    type: db.sequelize.QueryTypes.INSERT
                }),

                //Query para atualizar resultado da batalha anterior(a qual vamos voltar) para não realizado
                db.sequelize.query('UPDATE battles SET done = 0, winner = "", loser = "", battleNumber = 0 WHERE id = :batid', 
                {
                    replacements: {batid: battle.id},
                    type: db.sequelize.QueryTypes.INSERT
                })
        
            ]).then(() => {
                Promise.all([ 
                    //Retorna Ranking atualizado
                    db.sequelize.query("SELECT * FROM animes ORDER BY winpercentage DESC, victories DESC, defeats ASC, name ASC",
                    { 
                        type: db.sequelize.QueryTypes.SELECT 
                    }),

                    //Retorna batalhas passadas atualizado sem a batalha anterior
                    db.sequelize.query("SELECT * FROM battles WHERE done = 1 ORDER BY battleNumber DESC",
                    { 
                        type: db.sequelize.QueryTypes.SELECT 
                    }),

                    //Retorna dados do primeiro anime
                    db.sequelize.query("SELECT * FROM animes WHERE name = :animeName",
                    { 
                        replacements: { animeName: battle.anime1 },
                        type: db.sequelize.QueryTypes.SELECT 
                    }),
                    
                    //Retorna dados do segundo anime
                    db.sequelize.query("SELECT * FROM animes WHERE name = :animeName",
                    { 
                        replacements: { animeName: battle.anime2 },
                        type: db.sequelize.QueryTypes.SELECT 
                    })

                ]).then((dataT) => {
                    res.render('content', {battles: data[2], animes: dataT[0], pastBattles: dataT[1], anime1Data: dataT[2], anime2Data: dataT[3]});
                });

            });

            }else{
                res.redirect("/");
            }

    });
});

app.get('/reloadRank', function(req, res){//Primeiro limpa a batalha atual e pega a anterior
    Promise.all([//Pegando os animes que já existem primeiro
        db.sequelize.query("UPDATE animes SET victories = 0, battles = 0, defeats = 0, winpercentage = 0",//Zera os dados dos animes
        { 
            type: db.sequelize.QueryTypes.INSERT 
        })
    ]).then(() => {
         Promise.all([
            db.sequelize.query("SELECT * FROM animes",//Retorna todos os animes
            { 
                type: db.sequelize.QueryTypes.SELECT 
            }),

            db.sequelize.query("SELECT * FROM battles",//Retorna todas as batalhas
            { 
                type: db.sequelize.QueryTypes.SELECT 
            })
        ]).then((data) => {
           var animesList = data[0]
            var battlesList = data[1]

            animesList.forEach(anime => {
                battlesList.forEach(battle => {
                    if(anime.name == battle.winner){
                        db.sequelize.query('UPDATE animes SET victories = victories + 1, battles = battles + 1, winpercentage = victories/battles  WHERE name = :animeName',
                        {
                            replacements: { animeName: anime.name },
                            type: db.sequelize.QueryTypes.INSERT
                        })
                    }else if(anime.name == battle.loser){
                        db.sequelize.query('UPDATE animes SET defeats = defeats + 1, battles = battles + 1, winpercentage = victories/battles  WHERE name = :animeName',
                        {
                            replacements: { animeName: anime.name },
                            type: db.sequelize.QueryTypes.INSERT
                        })
                    }
                });
            });

            res.redirect("/");
        });
    });

});

app.post('/deleteRegistries', function(req, res){
    var dados = req.body
    var animesToDelete = Object.keys(dados)

    animesToDelete.forEach(element => {
        Promise.all([
            db.sequelize.query('DELETE FROM battles WHERE anime1 = :animeName OR anime2 = :animeName',//Apagando registros da tabela de batalhas
            {
                replacements: { animeName: element },
                type: db.sequelize.QueryTypes.DELETE
            }),
            db.sequelize.query('DELETE FROM animes WHERE name = :animeName',//Apagando registros da tabela de animes
            {
                replacements: { animeName: element },
                type: db.sequelize.QueryTypes.DELETE
            }),
        ]).then(() => {
            Promise.all([
                db.sequelize.query('SELECT * FROM battles WHERE done = 1 ORDER BY battleNumber ASC',//Selecionando todos as batalhas
                {
                    type: db.sequelize.QueryTypes.SELECT
                })
            ]).then((data) => {
                var count = 1;
                data[0].forEach(element => {
                    db.sequelize.query('UPDATE battles SET battleNumber = :number WHERE id = :batid', 
                    {
                        replacements: {batid: element.id, number: count},
                        type: db.sequelize.QueryTypes.INSERT
                    })
                    count++;
                });
                res.redirect("/reloadRank");
            })
        })
    });

});

app.listen(8080);