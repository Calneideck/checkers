using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class Game : MonoBehaviour
{
    // 0 = white, 1 = blue

    public GameObject tokenPrefab;
    public GameObject ghostPrefab;
    public Transform tokenHolder;
    public Color[] colours;
    public Transform board;
    public LayerMask tokenMask;

    private int turn = 1;
    private GameObject ghost;
    private int playerNumber = 1;

    private GameObject selectedToken;
    private Vector3 startPos;

    void Start()
    {
        ghost = Instantiate(ghostPrefab, tokenHolder);
        ghost.SetActive(false);
        NewGame();
    }

    void Update()
    {
        if (playerNumber != turn)
            return;

        if (Input.GetButtonDown("Fire1"))
        {
            RaycastHit2D hit = Physics2D.Raycast(Camera.main.ScreenToWorldPoint(Input.mousePosition), Vector2.zero, 1000, tokenMask);
            if (hit.collider != null)
            {
                selectedToken = hit.collider.gameObject;
                startPos = selectedToken.transform.position;
            }
        }
        else if (Input.GetButtonUp("Fire1"))
        {
            // Drop token
            iTween.MoveTo(selectedToken.gameObject, iTween.Hash("position", ));
            selectedToken = null;
        }

        if (selectedToken != null)
        {
            Vector3 pos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            pos.z = 0;
            selectedToken.transform.position = pos;
        }
    }

    void NewGame()
    {
        for (int i = 0; i < 20; i++)
        {
            GameObject token = Instantiate(tokenPrefab, board.GetChild(i).position, Quaternion.identity, tokenHolder);
            token.GetComponent<SpriteRenderer>().color = colours[0];
            token.tag = "White";
        }

        for (int i = 30; i < 50; i++)
        {
            GameObject token = Instantiate(tokenPrefab, board.GetChild(i).position, Quaternion.identity, tokenHolder);
            token.GetComponent<SpriteRenderer>().color = colours[1];
            token.tag = "Blue";
        }
    }
}
