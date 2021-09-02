document.onkeydown = checkKey;

function checkKey(e) {
    e = e || window.event;

    if (e.keyCode == '37') {
        document.getElementById("winnerButtonAnime1").click();
    } else if (e.keyCode == '39') {
        document.getElementById("winnerButtonAnime2").click();
    } else if (e.keyCode == '40') {
        document.getElementById("returnBattleButton").click();
    }

}