using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class MainMenu : MonoBehaviour
{
    public TCP tcp;
    public Transform canvas;
    public Game game;

    [Header("Screens")]
    public GameObject waitingScreen;
    public GameObject regScreen;
    public GameObject loginScreen;
    public GameObject mainMenuScreen;
    public GameObject gameCreatedScreen;
    public GameObject continueGameScreen;
    public GameObject gameScreen;
    public GameObject gameBoard;

    [Header("Login")]
    public InputField loginUserField;
    public InputField loginPasswordField;

    [Header("Register")]
    public InputField regUserField;
    public InputField regPasswordField;

    [Header("Create Game")]
    public Dropdown colourDropdown;

    [Header("Game Created")]
    public Text gameIdText;

    [Header("Continue Game")]
    public Transform scrollRect;
    public GameObject buttonPrefab;

    [Header("Join Game")]
    public InputField joinGameId;

    private string gameId;
    private int colour = -1;
    private string username;

    public void Register()
    {
        ShowWaiting();
        username = regUserField.text;
        tcp.LoginRegister(false, regUserField.text, regPasswordField.text, RegisterResult);
    }

    void RegisterResult(bool result)
    {
        if (result)
            mainMenuScreen.SetActive(true);
        else
            regScreen.SetActive(true);

        waitingScreen.SetActive(false);
    }

    public void Login()
    {
        ShowWaiting();
        username = loginUserField.text;
        tcp.LoginRegister(true, loginUserField.text, loginPasswordField.text, LoginResult);
    }

    void LoginResult(bool result)
    {
        if (result)
            mainMenuScreen.SetActive(true);
        else
            loginScreen.SetActive(true);

        waitingScreen.SetActive(false);
    }

    public void CreateGame()
    {
        ShowWaiting();
        colour = colourDropdown.value;
        tcp.CreateGame(colour, CreateGameResult);
    }

    void CreateGameResult(string gameId)
    {
        if (string.IsNullOrEmpty(gameId))
        {
            colour = -1;
            mainMenuScreen.SetActive(true);
        }
        else
        {
            // Success
            gameCreatedScreen.SetActive(true);
            gameIdText.text = gameId;
            this.gameId = gameId;
        }

        waitingScreen.SetActive(false);
    }

    public void StartGame()
    {
        GoToGame(null, 0, colour == 0 ? username : null, colour == 1 ? username : null);
        colour = -1;
    }

    public void RequestGamesList()
    {
        ShowWaiting();
        tcp.RequestGames(GamesListResult);
    }

    void GamesListResult(string[] list)
    {
        continueGameScreen.SetActive(true);

        if (list != null)
            foreach (string game in list)
            {
                GameObject btn = Instantiate(buttonPrefab, scrollRect);
                btn.GetComponentInChildren<Text>().text = game;
                string gameId = game;
                btn.GetComponent<Button>().onClick.AddListener(() => ContinueGame(gameId));
            }

        waitingScreen.SetActive(false);
    }

    void ContinueGame(string gameId)
    {
        ShowWaiting();
        this.gameId = gameId;
        RemoveGamesList();
        tcp.JoinResumeGame(gameId, GoToGame);
    }

    public void JoinGame()
    {
        if (!string.IsNullOrEmpty(joinGameId.text) && joinGameId.text.Length == 5)
        {
            ShowWaiting();
            gameId = joinGameId.text;
            tcp.JoinResumeGame(gameId, GoToGame);
        }
    }

    void GoToGame(GameLogic.Tile[] grid, int turn, string blue, string white)
    {
        if (gameId != null && !(blue == null && white == null))
        {
            for (int i = 0; i < canvas.childCount; i++)
                canvas.GetChild(i).gameObject.SetActive(false);

            if (grid != null)
                game.GenerateBoard(grid);
            else
                game.NewGame();

            gameScreen.SetActive(true);
            gameBoard.SetActive(true);
        }
        else
            mainMenuScreen.SetActive(true);

        waitingScreen.SetActive(false);
    }

    void ShowWaiting()
    {
        for (int i = 0; i < canvas.childCount - 1; i++)
            canvas.GetChild(i).gameObject.SetActive(false);

        waitingScreen.SetActive(true);
    }

    public void RemoveGamesList()
    {
        for (int i = 0; i < scrollRect.childCount; i++)
            Destroy(scrollRect.GetChild(i).gameObject);
    }
}
