using System.Collections.Generic;

public static class GameLogic
{
    public enum Tile { EMPTY, BLUE, BLUE_KING, WHITE, WHITE_KING }

    public struct Result
    {
        public bool success;
        public int removedToken;
        public int[] nextMoves;
        public bool king;

        public Result(bool success, int removedToken, int[] nextMoves, bool king)
        {
            this.success = success;
            this.removedToken = removedToken;
            this.nextMoves = nextMoves;
            this.king = king;
        }
    }

    private static Tile[] grid;
    private static int playerNumber; // 0 = blue, 1 = white
    private static int moved = -1;
    private static int playersTurn;
    private static bool jumpsAvail;
    private static int winner;

    public static void NewGame()
    {
        grid = new Tile[32];
        for (int i = 0; i < 32; i++)
        {
            if (i < 12)
                grid[i] = Tile.BLUE;
            else if (i >= 20)
                grid[i] = Tile.WHITE;
            else
                grid[i] = Tile.EMPTY;
        }
    }

    public static void SetGrid(Tile[] grid)
    {
        GameLogic.grid = grid;
    }

    public static void SetInfo(int playerNumber, int turn, int winner)
    {
        GameLogic.playerNumber = playerNumber;
        playersTurn = turn;
        GameLogic.winner = winner;
        GameLogic.moved = -1;
        CheckJumpAvail();
    }

    public static Result Move(int tileNumber, int targetTileNumber)
    {
        if (tileNumber < 0 || tileNumber >= 32 || targetTileNumber < 0 || targetTileNumber >= 32)
            return new Result(false, -1, null, false);

        // if game is over
        if (winner != -1)
            return new Result(false, -1, null, false);

        if (playerNumber != playersTurn)
            return new Result(false, -1, null, false);

        // Can only move own tokens
        if (playerNumber != OwnerOfTile(tileNumber))
            return new Result(false, -1, null, false);

        // Can only move to an empty tile
        if (grid[targetTileNumber] != Tile.EMPTY)
            return new Result(false, -1, null, false);

        int result = -1;
        if (playerNumber == 0 || IsKing(tileNumber))
            result = BlueRules(tileNumber, targetTileNumber);

        if (result == -1 && (playerNumber == 1 || IsKing(tileNumber)))
            result = WhiteRules(tileNumber, targetTileNumber);

        if (result != -1)
        {
            // Move the tokens
            moved = targetTileNumber;
            grid[targetTileNumber] = grid[tileNumber];
            grid[tileNumber] = Tile.EMPTY;
            bool king = false;

            // Upgrade to king
            if (playerNumber == 0)
            {
                if (GetRow(targetTileNumber) == 8)
                {
                    grid[targetTileNumber] = Tile.BLUE_KING;
                    king = true;
                }
            }
            else if (playerNumber == 1)
            {
                if (GetRow(targetTileNumber) == 1)
                {
                    grid[targetTileNumber] = Tile.WHITE_KING;
                    king = true;
                }
            }

            Result fullResult;
            // Only get next avail moves if jumped over opponent
            if (System.Math.Abs(GetRow(tileNumber) - GetRow(targetTileNumber)) == 1)
                fullResult = new Result(true, result, new int[0], king);
            else
            {
                // Jumped over so may get to continue
                if (result >= 0 && result < 32)
                    grid[result] = Tile.EMPTY;

                fullResult = new Result(true, result, GetAvailMoves(targetTileNumber), king);
            }

            if (fullResult.nextMoves.Length == 0)
            {
                // Set other player's turn
                playersTurn = 1 - playersTurn;
                moved = -1;
            }

            return fullResult;
        }
        else
            return new Result(false, -1, null, false);
    }

    public static int[] GetAvailMoves(int tileNumber)
    {
        if (tileNumber < 0 || tileNumber >= 32)
            return new int[0];

        if (winner != -1)
            return new int[0];

        List<int> moves = new List<int>();

        if (OwnerOfTile(tileNumber) == 0 || IsKing(tileNumber))
            BlueMoves(moves, tileNumber);

        if (OwnerOfTile(tileNumber) == 1 || IsKing(tileNumber))
            WhiteMoves(moves, tileNumber);

        return moves.ToArray();
    }

    private static void CheckJumpAvail()
    {
        jumpsAvail = false;
        for (int i = 0; i < 32; i++)
            if (OwnerOfTile(i) == playerNumber)
            {
                int[] moves = GetAvailMoves(i);
                for (int j = 0; j < moves.Length; j++)
                    if (System.Math.Abs(GetRow(i) - GetRow(moves[j])) == 2)
                    {
                        jumpsAvail = true;
                        return;
                    }
            }
    }

    private static int OwnerOfTile(int tileNumber)
    {
        Tile tile = grid[tileNumber];
        if (tile == Tile.BLUE || tile == Tile.BLUE_KING)
            return 0;
        else if (tile == Tile.WHITE || tile == Tile.WHITE_KING)
            return 1;
        else
            return -1;
    }

    private static bool IsKing(int tileNumber)
    {
        Tile tile = grid[tileNumber];
        return tile == Tile.BLUE_KING || tile == Tile.WHITE_KING;
    }

    private static void BlueMoves(List<int> moves, int tileNumber)
    {
        int row = GetRow(tileNumber);

        if (row >= 8)
            return;

        if (moved == -1 && !jumpsAvail)
        {
            if (grid[tileNumber + 4] == Tile.EMPTY)
                moves.Add(tileNumber + 4);

            if (OddRow(tileNumber))
            {
                if (tileNumber + 5 < 32 && grid[tileNumber + 5] == Tile.EMPTY && GetRow(tileNumber + 5) == row + 1)
                    moves.Add(tileNumber + 5);
            }
            else
            {
                if (tileNumber + 3 < 32 && grid[tileNumber + 3] == Tile.EMPTY && GetRow(tileNumber + 3) == row + 1)
                    moves.Add(tileNumber + 3);
            }
        }

        if (row >= 7 || (moved >= 0 && tileNumber != moved))
            return;

        // Jumping over opponent token
        if (tileNumber + 7 < 32 && grid[tileNumber + 7] == Tile.EMPTY && GetRow(tileNumber + 7) == row + 2)
        { 
            if (OwnerOfTile(tileNumber + (OddRow(tileNumber) ? 4 : 3)) == 1 - playerNumber)
                moves.Add(tileNumber + 7);
        }

        if (tileNumber + 9 < 32 && grid[tileNumber + 9] == Tile.EMPTY && GetRow(tileNumber + 9) == row + 2)
        {
            if (OwnerOfTile(tileNumber + (OddRow(tileNumber) ? 5 : 4)) == 1 - playerNumber)
                moves.Add(tileNumber + 9);
        }
    }

    private static void WhiteMoves(List<int> moves, int tileNumber)
    {
        int row = GetRow(tileNumber);

        if (row <= 1)
            return;

        if (moved == -1 && !jumpsAvail)
        {
            if (grid[tileNumber - 4] == Tile.EMPTY)
                moves.Add(tileNumber - 4);

            if (OddRow(tileNumber))
            {
                if (tileNumber - 3 >= 0 && grid[tileNumber - 3] == Tile.EMPTY && GetRow(tileNumber - 3) == row - 1)
                    moves.Add(tileNumber - 3);
            }
            else
            {
                if (tileNumber - 5 >= 0 && grid[tileNumber - 5] == Tile.EMPTY && GetRow(tileNumber - 5) == row - 1)
                    moves.Add(tileNumber - 5);
            }
        }

        if (row <= 2 || (moved >= 0 && tileNumber != moved))
            return;

        if (tileNumber - 7 >= 0 && grid[tileNumber - 7] == Tile.EMPTY && GetRow(tileNumber - 7) == row - 2)
        {
            if (OwnerOfTile(tileNumber - (OddRow(tileNumber) ? 3 : 4)) == 1 - playerNumber)
                moves.Add(tileNumber - 7);
        }

        if (tileNumber - 9 >= 0 && grid[tileNumber - 9] == Tile.EMPTY && GetRow(tileNumber - 9) == row - 2)
        {
            if (OwnerOfTile(tileNumber - (OddRow(tileNumber) ? 4 : 5)) == 1 - playerNumber)
                moves.Add(tileNumber - 9);
        }
    }

    private static int BlueRules(int tile, int targetTile)
    {
        int r1 = GetRow(tile);

        // Can't move beyond last row
        if (r1 >= 8)
            return -1;

        int r2 = GetRow(targetTile);

        if (r2 == r1 + 1)
        {
            // Can only continue jumping after jumping once
            if (moved != -1 || jumpsAvail)
                return -1;

            if (targetTile == tile + (OddRow(tile) ? 5 : 3) || targetTile == tile + 4)
                return 32;
        }
        else if (r2 == r1 + 2)
        {
            if (moved >= 0 && tile != moved)
                return -1;

            // Jumping over an opponent token
            // Check if valid diagonal jump and tile inbetween has an opponent token on it
            if (targetTile == tile + 7)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile + 4) == 1 - playerNumber)
                        return tile + 4;
                }
                else
                {
                    if (OwnerOfTile(tile + 3) == 1 - playerNumber)
                        return tile + 3;
                }
            }
            else if (targetTile == tile + 9)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile + 5) == 1 - playerNumber)
                        return tile + 5;
                }
                else
                {
                    if (OwnerOfTile(tile + 4) == 1 - playerNumber)
                        return tile + 4;
                }
            }
        }

        return -1;
    }

    private static int WhiteRules(int tile, int targetTile)
    {
        int r1 = GetRow(tile);

        // Can't move beyond last row
        if (r1 <= 1)
            return -1;

        int r2 = GetRow(targetTile);

        if (r2 == r1 - 1)
        {
            // Can only continue jumping after jumping once
            if (moved != -1 || jumpsAvail)
                return -1;

            if (targetTile == tile - (OddRow(tile) ? 3 : 5) || targetTile == tile - 4)
                return 32;
        }
        else if (r2 == r1 - 2)
        {
            if (moved >= 0 && tile != moved)
                return -1;

            // Jumping over an opponent token
            // Check if valid diagonal jump and tile inbetween has an opponent token on it
            if (targetTile == tile - 7)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile - 3) == 1 - playerNumber)
                        return tile - 3;
                }
                else
                {
                    if (OwnerOfTile(tile - 4) == 1 - playerNumber)
                        return tile - 4;
                }
            }
            else if (targetTile == tile - 9)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile - 4) == 1 - playerNumber)
                        return tile - 4;
                }
                else
                {
                    if (OwnerOfTile(tile - 5) == 1 - playerNumber)
                        return tile - 5;
                }
            }
        }

        return -1;
    }

    /// <summary>
    /// Returns 1 to 8
    /// </summary>
    private static int GetRow(int tile)
    {
        return (int)System.Math.Ceiling((tile + 1) / 4f);
    }

    private static bool OddRow(int tile)
    {
        return GetRow(tile) % 2 == 1;
    }
}
