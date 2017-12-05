using System.Collections.Generic;

public static class GameLogic
{
    public enum Tile { EMPTY, BLUE, BLUE_KING, WHITE, WHITE_KING }

    public struct Result
    {
        public bool success;
        public int removedToken;
        public int[] nextMoves;

        public Result(bool success, int removedToken, int[] nextMoves)
        {
            this.success = success;
            this.removedToken = removedToken;
            this.nextMoves = nextMoves;
        }
    }

    private static Tile[] grid;
    private static int playerNumber; // 0 = blue, 1 = white
    private static bool firstMove = true;
    private static int playersTurn;

    public static void NewGame()
    {
        grid = new Tile[50];
        for (int i = 0; i < 50; i++)
        {
            if (i < 20)
                grid[i] = Tile.BLUE;
            else if (i >= 35)
                grid[i] = Tile.WHITE;
            else
                grid[i] = Tile.EMPTY;
        }
    }

    public static Result Move(int tileNumber, int targetTileNumber)
    {
        if (playerNumber != playersTurn)
            return new Result(false, -1, null);

        // Can only move own tokens
        if (playerNumber == OwnerOfTile(tileNumber))
            return new Result(false, -1, null);

        // Can only move to an empty tile
        if (grid[targetTileNumber] != Tile.EMPTY)
            return new Result(false, -1, null);

        int result = -1;
        if (playerNumber == 0 || IsKing(tileNumber))
            result = BlueRules(tileNumber, targetTileNumber);

        if (result == -1 && (playerNumber == 1 || IsKing(tileNumber)))
            result = WhiteRules(tileNumber, targetTileNumber);

        if (result != -1)
        {
            Result result2 = new Result(true, result, GetAvailMoves(targetTileNumber));
            if (result2.nextMoves.Length == 0)
            {
                playersTurn = 1 - playersTurn;
                firstMove = true;
            }
            else
                firstMove = false;

            return result2;
        }
        else
            return new Result(false, -1, null); ;
    }

    public static int[] GetAvailMoves(int tileNumber)
    {
        List<int> moves = new List<int>();

        if (playerNumber == 0 || IsKing(tileNumber))
            BlueMoves(moves, tileNumber);

        if (playerNumber == 1 || IsKing(tileNumber))
            WhiteMoves(moves, tileNumber);

        return moves.ToArray();
    }

    /// <summary>
    /// Returns 1 to 10
    /// </summary>
    private static int  GetRow(int tile)
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

        if (row == 10)
            return;

        if (firstMove)
        {
            if (grid[tileNumber + 5] == Tile.EMPTY)
                moves.Add(tileNumber + 5);

            if (OddRow(tileNumber))
            {
                if (grid[tileNumber + 6] == Tile.EMPTY && GetRow(tileNumber + 6) == row + 1)
                    moves.Add(tileNumber + 6);
            }
            else
            {
                if (grid[tileNumber + 4] == Tile.EMPTY && GetRow(tileNumber + 4) == row + 1)
                    moves.Add(tileNumber + 4);
            }
        }

        if (row >= 9)
            return;

        // Jumping over opponent token
        if (grid[tileNumber + 9] == Tile.EMPTY && GetRow(tileNumber + 9) == row + 2)
        { 
            if (OddRow(tileNumber))
            {
                if (OwnerOfTile(tileNumber + 5) == 1 - playerNumber)
                    moves.Add(tileNumber + 9);
            }
            else
            {
                if (OwnerOfTile(tileNumber + 4) == 1 - playerNumber)
                    moves.Add(tileNumber + 9);
            }
        }

        if (grid[tileNumber + 11] == Tile.EMPTY && GetRow(tileNumber + 11) == row + 2)
        {
            if (OddRow(tileNumber))
            {
                if (OwnerOfTile(tileNumber + 6) == 1 - playerNumber)
                    moves.Add(tileNumber + 11);
            }
            else
            {
                if (OwnerOfTile(tileNumber + 5) == 1 - playerNumber)
                    moves.Add(tileNumber + 11);
            }
        }
    }

    private static void WhiteMoves(List<int> moves, int tileNumber)
    {
        int row = GetRow(tileNumber);

        if (row == 1)
            return;

        if (firstMove)
        {
            if (grid[tileNumber - 5] == Tile.EMPTY)
                moves.Add(tileNumber - 5);

            if (OddRow(tileNumber))
            {
                if (grid[tileNumber - 4] == Tile.EMPTY && GetRow(tileNumber - 4) == row - 1)
                    moves.Add(tileNumber - 4);
            }
            else
            {
                if (grid[tileNumber - 6] == Tile.EMPTY && GetRow(tileNumber - 6) == row - 1)
                    moves.Add(tileNumber - 6);
            }
        }

        if (row <= 2)
            return;

        if (grid[tileNumber - 9] == Tile.EMPTY && GetRow(tileNumber - 9) == row - 2)
        {
            if (OddRow(tileNumber))
            {
                if (OwnerOfTile(tileNumber - 4) == 1 - playerNumber)
                    moves.Add(tileNumber - 9);
            }
            else
            {
                if (OwnerOfTile(tileNumber - 5) == 1 - playerNumber)
                    moves.Add(tileNumber - 9);
            }
        }

        if (grid[tileNumber - 11] == Tile.EMPTY && GetRow(tileNumber - 11) == row + 2)
        {
            if (OddRow(tileNumber))
            {
                if (OwnerOfTile(tileNumber - 5) == 1 - playerNumber)
                    moves.Add(tileNumber - 11);
            }
            else
            {
                if (OwnerOfTile(tileNumber - 6) == 1 - playerNumber)
                    moves.Add(tileNumber - 11);
            }
        }
    }

    private static int BlueRules(int tile, int targetTile)
    {
        int r1 = GetRow(tile);

        // Can't move beyond last row
        if (r1 == 10)
            return -1;

        int r2 = GetRow(targetTile);

        // +5 is always safe
        if (targetTile == tile + 5)
            return 50;

        if (r2 == r1 + 1)
        {
            // Can only continue jumping after jumping once
            if (!firstMove)
                return -1;

            if (OddRow(tile))
            {
                if (targetTile == tile + 6)
                    return 50;
            }
            else
            {
                if (targetTile == tile + 4)
                    return 50;
            }
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
        if (r1 == 1)
            return -1;

        int r2 = GetRow(targetTile);

        // +5 is always safe
        if (targetTile == tile - 5)
            return 50;

        if (r2 == r1 - 1)
        {
            // Can only continue jumping after jumping once
            if (!firstMove)
                return -1;

            if (OddRow(tile))
            {
                if (targetTile == tile - 4)
                    return 50;
            }
            else
            {
                if (targetTile == tile - 6)
                    return 50;
            }
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
        return GetRow(tile) % 2 == 0;
    }
}
