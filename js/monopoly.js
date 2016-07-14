var Monopoly = {};//creating the Monopoly object
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 100; //starting money
Monopoly.doubleCounter = 0; // checks the amount of double the player makes
Monopoly.jailDoubleCounter = 0;
Monopoly.playerIsBroke = false;//new variable created to check that the amount of doubles the player rolls is less than 3

//initializing function
Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize(); // adjusts the board according to the size of the screen
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
        console.log(Monopoly.playerIsBroke);
    });
};

// starts the game by asking the user how many players he wants (between 1 and 6)
Monopoly.start = function () {
    Monopoly.showPopup("intro");
};

//function that checks if it is the player's turn to roll the dice and if yes rolls the dices
Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};

//to know which of the players is the current player
Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};

//saves the cell that the player is at the moment
Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};

//gets the ampunt of money the player currently has
Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

//functions that updates the amount of money the player has
Monopoly.updatePlayersMoney = function (player, amount) {

    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0) { // checks if the player is broke
        Monopoly.playerIsBroke = true;
        console.log(Monopoly.playerIsBroke)
    }
    if (Monopoly.playerIsBroke === true) {
        Monopoly.playerBroke();
    }
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");

};

//rolls the dices
Monopoly.rollDice = function () {
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1); //shows the correct rounds according to the html
    $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
    if (result1 == result2) {
        Monopoly.doubleCounter++; // if the dices are the same then we have a double so we will count them
        Monopoly.jailDoubleCounter++; // making sure the player does not rool more than 3 doubles otherwise he goes to jail
    }
    //if
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2); // call the function that will move the amount of steps according to the results of the roll dice
};

// moving the player
Monopoly.movePlayer = function (player, steps) {
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};

// handling a player's turn
Monopoly.handleTurn = function () {
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")) { // if the player is on an available property he can choose to buy it
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) { // otherwise if the property belongs to someone else the player must pay rent to the owner


        Monopoly.handlePayRent(player, playerCell);
    }

    else if (playerCell.is(".property:not(.available)") && playerCell.hasClass(player.attr("id"))) { // if the player gets on his own property he simp0ly has a smiley face that pop ups for 2 seconds
        var playerId = parseInt(player.attr("id").replace("player", ""));
        $(".player#player" + playerId).addClass("own-property");
        setTimeout(function () {
            $(".player#player" + playerId).removeClass("own-property");
        }, 2000);
        Monopoly.setNextPlayerTurn();
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else {
        Monopoly.setNextPlayerTurn();
    }
};

//setting the next player tuen
Monopoly.setNextPlayerTurn = function () {
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
    var nextPlayerId = playerId + 1;

    if (nextPlayerId > $(".player").length) { //if all the players played their turn it is time for a new round so we are setting the playerId back to 1
        nextPlayerId = 1;
    }
    if (Monopoly.doubleCounter === 1) { //checking if the player played a double once because if he did he plays again
        nextPlayerId = playerId;
        Monopoly.doubleCounter = 0;
    }
    if (Monopoly.jailDoubleCounter === 3) {
        Monopoly.handleGoToJail();
        Monopoly.jailDoubleCounter = 0;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);


    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")) { // if the player is jailed he has to wait 3 turns in jail until he can come out
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++; //counting the number of turns he was in jail
        nextPlayer.attr("data-jail-time", currentJailTime);
        if (currentJailTime > 3) {
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time"); //once the 3 turns are over the player gets out of jail
        }
        Monopoly.setNextPlayerTurn(); //changing the turns
        return;
    }
    if (nextPlayer.is(".broke")) {
        Monopoly.setNextPlayerTurn(); //changing the turns
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

//giving the player that fell on an available property the possibility to buy it
Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) { //if the player wants to buy the property then we handle the buy
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn(); // otherwise we close the window
        }
    });
    Monopoly.showPopup("buy");
};

//handling the paying of the rent
Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));// checks the rent of the property
    var properyOwnerId = propertyCell.attr("data-owner"); // first we check who is the owner of the property the player is on and save the info
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var propertyOwner = $(".player#" + properyOwnerId); //selects the property owner
        Monopoly.updatePlayersMoney(player, currentRent);//substracts the rent amount from the player's money
        Monopoly.updatePlayersMoney(propertyOwner, -1 * currentRent); // adds the rent to the owner of the property
        Monopoly.closeAndNextTurn();

    });
    Monopoly.showPopup("pay");
};

// when the play has to go the jail shows the "jail" pop up and then calls the "jail" action
Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};

//creates a pop up with a chance card. the answer comes from an object that has a few properties including the amount that needs to be added or substracted to the player's money
Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount); // calls the handle action function with the action that was randomly sleceted and the amount
    });
    Monopoly.showPopup("chance");
};

//creates a pop up with a community card. the answer comes from an object that has a few properties including the amount that needs to be added or substracted to the player's money
Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};


// when the player is sent to jail we add him a class to add a sad smiley face to him and we start counting the number of turns he is in jail
Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//function that selects a pop up windiw
Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};

//function that calculates the cost of the properties according to their group there are * groups so the property goes from 5 to 40 according to the group's place on the board
Monopoly.calculateProperyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};

// the rent is half of the property cost
Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2;
};

// closes the pop up and changes the player's turn
Monopoly.closeAndNextTurn = function () {
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//checks that the number of players is a valid input
Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};
// if the player is Broke plays a sound shows a pop up and takes all his properties and makes them available again
Monopoly.playerBroke = function () {
    console.log('in');
    var player = Monopoly.getCurrentPlayer();
    var playerId = parseInt(player.attr("id").replace("player", ""));
    console.log(player);
    console.log(playerId);
    var playerCell = Monopoly.getPlayersCell(player);
    var playersMoney = Monopoly.getPlayersMoney(player);
    var popup = Monopoly.getPopup("broke"); // if the player is broke get the "broke" pop up
    Monopoly.playSound("gunshot");
    Monopoly.showPopup("broke");//shows the pop up and then closes it
    setTimeout(function () {
        $(".popup-lightbox").fadeOut();
    }, 2000);
    console.log($('.property.player' + playerId).length + " " + playerId + " -- " + ".cell.player" + playerId)
    $('.property.player' + playerId).addClass('available').removeClass('player' + playerId)
        .removeAttr("data-owner");
    $('#player' + playerId).addClass('broke');
    Monopoly.setNextPlayerTurn();
};
//allows the player to buy the property if he has enough money
Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    console.log('in');
    var playersMoney = Monopoly.getPlayersMoney(player);
    if (playersMoney < propertyCost) {
        Monopoly.showErrorMsg();
        Monopoly.playSound("whine");
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);
        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        Monopoly.setNextPlayerTurn(); // when the player buys the property it is not available anymore and becomes his
    }
};

//handles the actions
Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            Monopoly.closePopup();
            break;
        case "pay": // if the player is not broke he pays
            Monopoly.updatePlayersMoney(player, amount);
            Monopoly.closePopup();

            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            Monopoly.closePopup();
            break;
    }


};

//creates players according to the user's choice at the beginning of the game
Monopoly.createPlayers = function (numOfPlayers) {
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};

//allows the player to go to the next cell
Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1;
    if (nextCellId > 40) { // there are 40 cells in the game so over 40 it means that we finished a turn and we should reinitinalize
        Monopoly.handlePassedGo(); // also means we passed the go
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

// when the player passed the go he gets 10% of the money he got at the started added to his account
Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney += (Monopoly.moneyAtStart / 10);
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");

};

// a valid player input is between 1 and 6 players this function checks that the user chose a valid input of players
Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    if (1 < value <= 6) {
        isValid = true;
    }

    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;

};

//shows the error pop up
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};

// adjusts the board according to the size of the screen
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({"height": boardSize, "width": boardSize});
};

//closes an open pop up
Monopoly.closePopup = function () {
    if (Monopoly.playerIsBroke === false) {
        $(".popup-lightbox").fadeOut();
    }
};
//plays a sound
Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
};

//shows a pop up according to the chosen id that is the input of the function
Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};
//calling the init function
Monopoly.init();