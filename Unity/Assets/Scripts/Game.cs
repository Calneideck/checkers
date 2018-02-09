using UnityEngine;
using UnityEngine.UI;
using System.Linq;
using System.Collections.Generic;

public class Game : MonoBehaviour
{
    public struct GameData
    {
        public GameLogic.Tile[] grid;
        public int turn;
        public string blue;
        public string white;
        public int winner;

        public GameData(GameLogic.Tile[] grid, int turn, string blue, string white, int winner)
        {
            this.grid = grid;
            this.turn = turn;
            this.blue = blue;
            this.white = white;
            this.winner = winner;
        }
    }
    
    // 0 = blue, 1 = white

    public TCP tcp;
    public GameObject tokenPrefab;
    public Transform tokenHolder;
    public Color[] colours;
    public Text[] playerNames;
    public Outline[] playerNameOutlines;
    public Transform board;
    public LayerMask tokenMask;
    public GameObject highlightPrefab;
    public Sprite kingSprite;

    private int turn = -1;
    private int playerNumber = -1;
    private int tileToMove = -1;
    private List<int> moves = new List<int>();

    private bool down;
    private List<GameObject> tokens = new List<GameObject>();
    private GameObject selectedToken;
    private Vector3 startPos;
    private List<GameObject> highlights = new List<GameObject>();

    void Start()
    {
        for (int i = 0; i < 4; i++)
        {
            highlights.Add(Instantiate(highlightPrefab));
            highlights.Last().SetActive(false);
        }
    }

    void Update()
    {
        if (playerNumber != turn)
            return;

        if (Input.GetButtonDown("Fire1"))
            PickupToken();
        else if (!Input.GetButton("Fire1") && down)
            PlaceToken();

        if (selectedToken != null)
        {
            Vector3 pos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            pos.z = 0;
            selectedToken.transform.position = pos;
        }
    }

    void PickupToken()
    {
        down = true;
        RaycastHit2D hit = Physics2D.Raycast(Camera.main.ScreenToWorldPoint(Input.mousePosition), Vector2.zero, 1000, tokenMask);
        if (hit.collider != null)
        {
            selectedToken = hit.collider.gameObject;
            if (selectedToken.tag == "Blue" && playerNumber == 1 || selectedToken.tag == "White" && playerNumber == 0)
            {
                // Can't pickup other player's tokens
                selectedToken = null;
                return;
            }

            startPos = selectedToken.transform.position;
            int[] moves = GameLogic.GetAvailMoves(selectedToken.GetComponent<Token>().Index);
            for (int i = 0; i < moves.Length; i++)
            {
                GameObject highlight = highlights[i];
                highlight.transform.position = board.GetChild(moves[i]).position;
                highlight.SetActive(true);
            }
        }
    }

    void PlaceToken()
    {
        if (selectedToken != null)
        {
            Transform targetTile = GetClosestTile(Camera.main.ScreenToWorldPoint(Input.mousePosition));
            GameLogic.Result result = GameLogic.Move(selectedToken.GetComponent<Token>().Index, targetTile.transform.GetSiblingIndex());
            if (result.success)
            {
                iTween.MoveTo(selectedToken.gameObject, iTween.Hash("position", targetTile.position, "time", 0.5f));

                if (tileToMove == -1)
                    tileToMove = selectedToken.GetComponent<Token>().Index;

                moves.Add(targetTile.transform.GetSiblingIndex());
                selectedToken.GetComponent<Token>().Index = targetTile.transform.GetSiblingIndex();

                if (result.king && !selectedToken.GetComponent<Token>().King)
                {
                    selectedToken.GetComponent<SpriteRenderer>().sprite = kingSprite;
                    selectedToken.GetComponent<Token>().King = true;
                }

                if (result.removedToken >= 0 && result.removedToken < 50)
                {
                    GameObject removedToken = TokenFromIndex(result.removedToken);
                    tokens.Remove(removedToken);
                    Destroy(removedToken);
                }

                if (result.nextMoves.Length == 0)
                {
                    playerNameOutlines[turn].enabled = false;
                    turn = 1 - turn;
                    playerNameOutlines[turn].enabled = true;

                    // Submit move
                    tcp.Move(tileToMove, moves.ToArray());
                    tileToMove = -1;
                    moves.Clear();
                }
            }
            else
            {
                // Drop token
                iTween.MoveTo(selectedToken.gameObject, iTween.Hash("position", startPos, "time", 0.5f));
            }

            // Clear highlights
            foreach (GameObject highlight in highlights)
                highlight.SetActive(false);

            selectedToken = null;
        }

        down = false;
    }

    public void OpenGame(GameLogic.Tile[] grid, int turn, int colour, string blue, string white, int winner)
    {
        ClearBoard();
        if (grid != null)
        {
            for (int i = 0; i < grid.Length; i++)
                if (grid[i] != GameLogic.Tile.EMPTY)
                    CreateToken(i, grid[i]);

            GameLogic.SetGrid(grid);
        }
        else
            NewGame();

        if (blue != null)
            playerNames[0].text = blue;

        if (white != null)
            playerNames[1].text = white;

        playerNameOutlines[1 - turn].enabled = false;
        playerNameOutlines[turn].enabled = true;
        playerNumber = colour;
        this.turn = turn;
        GameLogic.SetInfo(colour, turn, winner);
    }

    void NewGame()
    {
        for (int i = 0; i < 20; i++)
            CreateToken(i, GameLogic.Tile.BLUE);

        for (int i = 30; i < 50; i++)
            CreateToken(i, GameLogic.Tile.WHITE);

        GameLogic.NewGame();
    }

    void ClearBoard()
    {
        foreach (GameObject token in tokens)
            Destroy(token);

        tokens.Clear();
    }

    private void CreateToken(int index, GameLogic.Tile tile)
    {
        GameObject token = Instantiate(tokenPrefab, board.GetChild(index).position, Quaternion.identity, tokenHolder);

        if (tile == GameLogic.Tile.BLUE || tile == GameLogic.Tile.BLUE_KING)
        {
            token.GetComponent<SpriteRenderer>().color = colours[1];
            token.tag = "Blue";
        }
        else if (tile == GameLogic.Tile.WHITE || tile == GameLogic.Tile.WHITE_KING)
        {
            token.GetComponent<SpriteRenderer>().color = colours[0];
            token.tag = "White";
        }

        if (tile == GameLogic.Tile.BLUE_KING || tile == GameLogic.Tile.WHITE_KING)
        {
            token.GetComponent<SpriteRenderer>().sprite = kingSprite;
            token.GetComponent<Token>().King = true;
        }

        token.GetComponent<Token>().Index = index;
        tokens.Add(token);
    }

    private Transform GetClosestTile(Vector2 pos)
    {
        float closestDistance = Vector2.Distance(board.GetChild(0).position, pos);
        Transform closestTile = board.GetChild(0);

        for (int i = 1; i < board.childCount; i++)
        {
            float dist = Vector2.Distance(board.GetChild(i).position, pos);
            if (dist < closestDistance)
            {
                closestDistance = dist;
                closestTile = board.GetChild(i);
            }
        }

        return closestTile;
    }

    private GameObject TokenFromIndex(int index)
    {
        foreach (GameObject token in tokens)
            if (token.GetComponent<Token>().Index == index)
                return token;

        return null;
    }
}
