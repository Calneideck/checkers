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
    private static bool firstMove = true;
    private static int playersTurn;
    private static bool jumpsAvail;

    public static void NewGame()
    {
        grid = new Tile[50];
        for (int i = 0; i < 50; i++)
        {
            if (i < 20)
                grid[i] = Tile.BLUE;
            else if (i >= 30)
                grid[i] = Tile.WHITE;
            else
                grid[i] = Tile.EMPTY;
        }
    }

    public static Result Move(int tileNumber, int targetTileNumber)
    {
        if (tileNumber < 0 || tileNumber >= 50 || targetTileNumber < 0 || targetTileNumber >= 50)
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
            firstMove = false;
            grid[targetTileNumber] = grid[tileNumber];
            grid[tileNumber] = Tile.EMPTY;
            bool king = false;

            // Upgrade to king
            if (playerNumber == 0)
            {
                if (GetRow(targetTileNumber) == 10)
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
                if (result >= 0 && result < 50)
                    grid[result] = Tile.EMPTY;

                fullResult = new Result(true, result, GetAvailMoves(targetTileNumber), king);
            }

            if (fullResult.nextMoves.Length == 0)
            {
                playersTurn = 1 - playersTurn;

                // TESTING - REMOVE THIS LINE
                playerNumber = 1 - playerNumber;

                firstMove = true;
                GetAvailJumps();
            }

            return fullResult;
        }
        else
            return new Result(false, -1, null, false);
    }

    public static int[] GetAvailMoves(int tileNumber)
    {
        if (tileNumber < 0 || tileNumber >= 50)
            return new int[0];

        if (playerNumber != OwnerOfTile(tileNumber))
            return new int[0];

        List<int> moves = new List<int>();

        if (playerNumber == 0 || IsKing(tileNumber))
            BlueMoves(moves, tileNumber);

        if (playerNumber == 1 || IsKing(tileNumber))
            WhiteMoves(moves, tileNumber);

        return moves.ToArray();
    }

    private static void GetAvailJumps()
    {
        jumpsAvail = false;
        for (int i = 0; i < 50; i++)
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

    /// <summary>
    /// Returns 1 to 10
    /// </summary>
    private static int GetRow(int tile)
    {
        return (int)System.Math.Ceiling((tile + 1) / 5f);
    }

    private static int  OwnerOfTile(int tileNumber)
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

        if (row >= 10)
            return;

        if (firstMove && !jumpsAvail)
        {
            if (grid[tileNumber + 5] == Tile.EMPTY)
                moves.Add(tileNumber + 5);

            if (OddRow(tileNumber))
            {
                if (tileNumber + 6 < 50 && grid[tileNumber + 6] == Tile.EMPTY && GetRow(tileNumber + 6) == row + 1)
                    moves.Add(tileNumber + 6);
            }
            else
            {
                if (tileNumber + 4 < 50 && grid[tileNumber + 4] == Tile.EMPTY && GetRow(tileNumber + 4) == row + 1)
                    moves.Add(tileNumber + 4);
            }
        }

        if (row >= 9)
            return;

        // Jumping over opponent token
        if (tileNumber + 9 < 50 && grid[tileNumber + 9] == Tile.EMPTY && GetRow(tileNumber + 9) == row + 2)
        { 
            if (OwnerOfTile(tileNumber + (OddRow(tileNumber) ? 5 : 4)) == 1 - playerNumber)
                moves.Add(tileNumber + 9);
        }

        if (tileNumber + 11 < 50 && grid[tileNumber + 11] == Tile.EMPTY && GetRow(tileNumber + 11) == row + 2)
        {
            if (OwnerOfTile(tileNumber + (OddRow(tileNumber) ? 6 : 5)) == 1 - playerNumber)
                moves.Add(tileNumber + 11);
        }
    }

    private static void WhiteMoves(List<int> moves, int tileNumber)
    {
        int row = GetRow(tileNumber);

        if (row <= 1)
            return;

        if (firstMove && !jumpsAvail)
        {
            if (grid[tileNumber - 5] == Tile.EMPTY)
                moves.Add(tileNumber - 5);

            if (OddRow(tileNumber))
            {
                if (tileNumber - 4 >= 0 && grid[tileNumber - 4] == Tile.EMPTY && GetRow(tileNumber - 4) == row - 1)
                    moves.Add(tileNumber - 4);
            }
            else
            {
                if (tileNumber - 6 >= 0 && grid[tileNumber - 6] == Tile.EMPTY && GetRow(tileNumber - 6) == row - 1)
                    moves.Add(tileNumber - 6);
            }
        }

        if (row <= 2)
            return;

        if (tileNumber - 9 >= 0 && grid[tileNumber - 9] == Tile.EMPTY && GetRow(tileNumber - 9) == row - 2)
        {
            if (OwnerOfTile(tileNumber - (OddRow(tileNumber) ? 4 : 5)) == 1 - playerNumber)
                moves.Add(tileNumber - 9);
        }

        if (tileNumber - 11 >= 0 && grid[tileNumber - 11] == Tile.EMPTY && GetRow(tileNumber - 11) == row - 2)
        {
            if (OwnerOfTile(tileNumber - (OddRow(tileNumber) ? 5 : 6)) == 1 - playerNumber)
                moves.Add(tileNumber - 11);
        }
    }

    private static int BlueRules(int tile, int targetTile)
    {
        int r1 = GetRow(tile);

        // Can't move beyond last row
        if (r1 >= 10)
            return -1;

        int r2 = GetRow(targetTile);

        // +5 is always safe
        if (targetTile == tile + 5)
            return 50;

        if (r2 == r1 + 1)
        {
            // Can only continue jumping after jumping once
            if (!firstMove || jumpsAvail)
                return -1;

            if (targetTile == tile + (OddRow(tile) ? 6 : 4))
                return 50;
        }
        else if (r2 == r1 + 2)
        {
            // Jumping over an opponent token
            // Check if valid diagonal jump and tile inbetween has an opponent token on it
            if (targetTile == tile + 9)
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
            else if (targetTile == tile + 11)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile + 6) == 1 - playerNumber)
                        return tile + 6;
                }
                else
                {
                    if (OwnerOfTile(tile + 5) == 1 - playerNumber)
                        return tile + 5;
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

        // +5 is always safe
        if (targetTile == tile - 5)
            return 50;

        if (r2 == r1 - 1)
        {
            // Can only continue jumping after jumping once
            if (!firstMove || jumpsAvail)
                return -1;

            if (targetTile == tile - (OddRow(tile) ? 4 : 6))
                return 50;
        }
        else if (r2 == r1 - 2)
        {
            // Jumping over an opponent token
            // Check if valid diagonal jump and tile inbetween has an opponent token on it
            if (targetTile == tile - 9)
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
            else if (targetTile == tile - 11)
            {
                if (OddRow(tile))
                {
                    if (OwnerOfTile(tile - 5) == 1 - playerNumber)
                        return tile - 5;
                }
                else
                {
                    if (OwnerOfTile(tile - 6) == 1 - playerNumber)
                        return tile - 6;
                }
            }
        }

        return -1;
    }

    private static bool OddRow(int tile)
    {
        return GetRow(tile) % 2 == 1;
    }
}
