using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Linq;
using System.Collections.Generic;

public class Game : MonoBehaviour
{
    // 0 = white, 1 = blue

    public GameObject tokenPrefab;
    public Transform tokenHolder;
    public Color[] colours;
    public Transform board;
    public LayerMask tokenMask;
    public GameObject highlightPrefab;

    private int turn = 1;
    private int playerNumber = 1;

    private bool down;
    private List<GameObject> tokens = new List<GameObject>();
    private GameObject selectedToken;
    private Vector3 startPos;
    private List<GameObject> highlights = new List<GameObject>();

    void Start()
    {
        GameLogic.NewGame();
        NewGame();
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
        {
            down = true;
            RaycastHit2D hit = Physics2D.Raycast(Camera.main.ScreenToWorldPoint(Input.mousePosition), Vector2.zero, 1000, tokenMask);
            if (hit.collider != null)
            {
                selectedToken = hit.collider.gameObject;
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
        else if (!Input.GetButton("Fire1") &&  down)
        {
            if (selectedToken != null)
            {
                Transform targetTile = GetClosestTile(Camera.main.ScreenToWorldPoint(Input.mousePosition));
                GameLogic.Result result = GameLogic.Move(selectedToken.GetComponent<Token>().Index, targetTile.transform.GetSiblingIndex());
                if (result.success)
                {
                    iTween.MoveTo(selectedToken.gameObject, iTween.Hash("position", targetTile.position, "time", 0.5f));
                    selectedToken.GetComponent<Token>().Index = targetTile.transform.GetSiblingIndex();
                    if (result.removedToken >= 0 && result.removedToken < 50)
                    {
                        GameObject removedToken = TokenFromIndex(result.removedToken);
                        tokens.Remove(removedToken);
                        Destroy(removedToken);
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

        if (selectedToken != null)
        {
            Vector3 pos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            pos.z = 0;
            selectedToken.transform.position = pos;
        }
    }

    void ClearBoard()
    {
        foreach (GameObject token in tokens)
            Destroy(token);

        tokens.Clear();
    }

    void NewGame()
    {
        for (int i = 0; i < 20; i++)
        {
            GameObject token = Instantiate(tokenPrefab, board.GetChild(i).position, Quaternion.identity, tokenHolder);
            token.GetComponent<SpriteRenderer>().color = colours[1];
            token.GetComponent<Token>().Index = i;
            token.tag = "Blue";
            tokens.Add(token);
        }

        for (int i = 30; i < 50; i++)
        {
            GameObject token = Instantiate(tokenPrefab, board.GetChild(i).position, Quaternion.identity, tokenHolder);
            token.GetComponent<SpriteRenderer>().color = colours[0];
            token.GetComponent<Token>().Index = i;
            token.tag = "White";
            tokens.Add(token);
        }
    }

    public void GenerateBoard(GameLogic.Tile[] grid)
    {

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
