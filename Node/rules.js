const Tile = {
    EMPTY: 0,
    BLUE: 1,
    BLUE_KING: 2,
    WHITE: 3,
    WHITE_KING: 4
};

module.exports = {
    move: function(board, playerNumber, turn, tile, moves) {
        if (tile < 0 || tile >= 50)
            return { success: false }

        for (var i = 0; i < moves.length; i++)
            if (moves[i] < 0 || moves[i] >= 50)
                return { success: false }

        if (playerNumber != turn)
            return { success: false }

        board = board.split(',');

        if (playerNumber != ownerOfTile(board, tile))
            return { success: false }

        var nextMoves = [];
        var jumping = false;

        // Iterate through each move (may be multiple if jumping)
        for (var i = 0; i < moves.length; i++) {
            if (i > 0)
                tile = moves[i - 1];

            var targetTile = moves[i];
            if (board[targetTile] != Tile.EMPTY)
                return { success: false }

            var jumpsAvail = jumping ? true : isJumpAvail(board, playerNumber)
            var result = -1;

            if (playerNumber == 0 || isKing(board, tile))
                result = blueRules(board, playerNumber, tile, targetTile, jumpsAvail, jumping);

            if (result == -1 && (playerNumber == 1 || isKing(board, tile)))
                result = whiteRules(board, playerNumber, tile, targetTile, jumpsAvail, jumping);

            if (result != -1) {
                // Move the tokens
                board[targetTile] = board[tile];
                board[tile] = Tile.EMPTY;
        
                // Upgrade to king
                if (playerNumber == 0 && getRow(targetTile) == 10)
                    board[targetTile] = Tile.BLUE_KING;
                else if (playerNumber == 1 && getRow(targetTile) == 1)
                    board[targetTile] = Tile.WHITE_KING;
        
                var fullResult = { success: true, winner: -1 };
                // Check if jumped over opponent
                if (Math.abs(getRow(tile) - getRow(targetTile)) == 2) {
                    // Remove token that got jumped over
                    if (result >= 0 && result < 50) {
                        board[result] = Tile.EMPTY;
                        jumping = true;
                    }
                    else
                        console.log('Inconsistent state!', result)
        
                    nextMoves = getAvailMoves(board, playerNumber, targetTile, jumpsAvail, jumping);
                }

                fullResult.board = board.join(',');
                if (nextMoves.length == 0) {
                    fullResult.winner = checkWinner(board, 1 - turn, 1 - playerNumber, jumpsAvail, jumping);
                    return fullResult;
                }
            }
            else
                return { success: false }
        }
    }
}

function isJumpAvail(board, playerNumber)
{
    for (var i = 0; i < 50; i++)
        if (ownerOfTile(board, i) == playerNumber)
        {
            var moves = getAvailMoves(board, playerNumber, i, true, true);
            for (var j = 0; j < moves.length; j++)
                if (Math.abs(getRow(i) - getRow(moves[j])) == 2)
                    return true;
        }

    return false;
}

function getAvailMoves(board, playerNumber, tileNumber, jumpsAvail, jumping)
{
    if (tileNumber < 0 || tileNumber >= 50)
        return null

    var moves = [];

    if (ownerOfTile(board, tileNumber) == 0 || isKing(board, tileNumber))
        moves = blueMoves(board, playerNumber, tileNumber, moves, jumpsAvail, jumping);

    if (ownerOfTile(board, tileNumber) == 1 || isKing(board, tileNumber))
        moves = whiteMoves(board, playerNumber, tileNumber, moves, jumpsAvail, jumping);

    return moves;
}

function ownerOfTile(board, tileNumber)
{
    var tile = board[tileNumber];
    if (tile == Tile.BLUE || tile == Tile.BLUE_KING)
        return 0;
    else if (tile == Tile.WHITE || tile == Tile.WHITE_KING)
        return 1;
    else
        return -1;
}

function isKing(board, tileNumber)
{
    var tile = board[tileNumber];
    return tile == Tile.BLUE_KING || tile == Tile.WHITE_KING;
}

function checkWinner(board, turn, playerNumber)
{
    var jumpsAvail = isJumpAvail(board, playerNumber);
    for (var i = 0; i < board.length; i++)
        if (ownerOfTile(board, i) == turn)
            if (getAvailMoves(board, playerNumber, i, jumpsAvail, false).length > 0)
                return -1;

    return 1 - turn;
}

function blueMoves(board, playerNumber, tileNumber, moves, jumpsAvail, jumping)
{
    var row = getRow(tileNumber);
    if (row >= 10)
        return moves;

    if (!jumping && !jumpsAvail)
    {
        if (board[tileNumber + 5] == Tile.EMPTY)
            moves.push(tileNumber + 5);

        if (oddRow(tileNumber))
        {
            if (tileNumber + 6 < 50 && board[tileNumber + 6] == Tile.EMPTY && getRow(tileNumber + 6) == row + 1)
                moves.push(tileNumber + 6);
        }
        else
        {
            if (tileNumber + 4 < 50 && board[tileNumber + 4] == Tile.EMPTY && getRow(tileNumber + 4) == row + 1)
                moves.push(tileNumber + 4);
        }
    }

    if (row >= 9)
        return moves;

    // Jumping over opponent token
    if (tileNumber + 9 < 50 && board[tileNumber + 9] == Tile.EMPTY && getRow(tileNumber + 9) == row + 2)
        if (ownerOfTile(board, tileNumber + (oddRow(tileNumber) ? 5 : 4)) == 1 - playerNumber)
            moves.push(tileNumber + 9);

    if (tileNumber + 11 < 50 && board[tileNumber + 11] == Tile.EMPTY && getRow(tileNumber + 11) == row + 2)
        if (ownerOfTile(board, tileNumber + (oddRow(tileNumber) ? 6 : 5)) == 1 - playerNumber)
            moves.push(tileNumber + 11);

    return moves;
}

function whiteMoves(board, playerNumber, tileNumber, moves, jumpsAvail, jumping)
{
    var row = getRow(tileNumber);
    if (row <= 1)
        return moves;

    if (!jumping && !jumpsAvail)
    {
        if (board[tileNumber - 5] == Tile.EMPTY)
            moves.push(tileNumber - 5);

        if (oddRow(tileNumber))
        {
            if (tileNumber - 4 >= 0 && board[tileNumber - 4] == Tile.EMPTY && getRow(tileNumber - 4) == row - 1)
                moves.push(tileNumber - 4);
        }
        else
        {
            if (tileNumber - 6 >= 0 && board[tileNumber - 6] == Tile.EMPTY && getRow(tileNumber - 6) == row - 1)
                moves.push(tileNumber - 6);
        }
    }

    if (row <= 2)
        return moves;

    // Jumping over opponent token
    if (tileNumber - 9 >= 0 && board[tileNumber - 9] == Tile.EMPTY && getRow(tileNumber - 9) == row - 2)
        if (ownerOfTile(board, tileNumber - (oddRow(tileNumber) ? 4 : 5)) == 1 - playerNumber)
            moves.push(tileNumber - 9);

    if (tileNumber - 11 >= 0 && board[tileNumber - 11] == Tile.EMPTY && getRow(tileNumber - 11) == row - 2)
        if (ownerOfTile(board, tileNumber - (oddRow(tileNumber) ? 5 : 6)) == 1 - playerNumber)
            moves.push(tileNumber - 11);
    
    return moves;
}

function blueRules(board, playerNumber, tileNumber, targetTile, jumpsAvail, jumping)
{
    var r1 = getRow(tileNumber);

    // Can't move beyond last row
    if (r1 >= 10)
        return -1;

    var r2 = getRow(targetTile);

    if (r2 == r1 + 1)
    {
        if (jumping || jumpsAvail)
            return -1;

        if (targetTile == tileNumber + (oddRow(tileNumber) ? 6 : 4) || targetTile == tileNumber + 5)
            return 50;
    }
    else if (r2 == r1 + 2)
    {
        // Jumping over an opponent token
        // Check if valid diagonal jump and tile inbetween has an opponent token on it
        if (targetTile == tileNumber + 9)
        {
            if (oddRow(tileNumber))
            {
                if (ownerOfTile(board, tileNumber + 5) == 1 - playerNumber)
                    return tileNumber + 5;
            }
            else
            {
                if (ownerOfTile(board, tileNumber + 4) == 1 - playerNumber)
                    return tileNumber + 4;
            }
        }
        else if (targetTile == tileNumber + 11)
        {
            if (oddRow(tileNumber))
            {
                if (ownerOfTile(board, tileNumber + 6) == 1 - playerNumber)
                    return tileNumber + 6;
            }
            else
            {
                if (ownerOfTile(board, tileNumber + 5) == 1 - playerNumber)
                    return tileNumber + 5;
            }
        }
    }

    return -1;
}

function whiteRules(board, playerNumber, tileNumber, targetTile, jumpsAvail, jumping)
{
    var r1 = getRow(tileNumber);

    // Can't move beyond last row
    if (r1 <= 1)
        return -1;

    var r2 = getRow(targetTile);

    if (r2 == r1 - 1)
    {
        // Can only continue jumping after jumping once
        if (jumping || jumpsAvail)
            return -1;

        if (targetTile == tileNumber - (oddRow(tileNumber) ? 4 : 6) || targetTile == tileNumber - 5)
            return 50;
    }
    else if (r2 == r1 - 2)
    {
        // Jumping over an opponent token
        // Check if valid diagonal jump and tile inbetween has an opponent token on it
        if (targetTile == tileNumber - 9)
        {
            if (oddRow(tileNumber))
            {
                if (ownerOfTile(board, tileNumber - 4) == 1 - playerNumber)
                    return tileNumber - 4;
            }
            else
            {
                if (ownerOfTile(board, tileNumber - 5) == 1 - playerNumber)
                    return tileNumber - 5;
            }
        }
        else if (targetTile == tileNumber - 11)
        {
            if (oddRow(tileNumber))
            {
                if (ownerOfTile(board, tileNumber - 5) == 1 - playerNumber)
                    return tileNumber - 5;
            }
            else
            {
                if (ownerOfTile(board, tileNumber - 6) == 1 - playerNumber)
                    return tileNumber - 6;
            }
        }
    }

    return -1;
}

/// Returns 1 to 10
function getRow(tile)
{
    return Math.ceil((tile + 1) / 5);
}

function oddRow(tile)
{
    return getRow(tile) % 2 == 1;
}
