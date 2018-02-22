using UnityEngine;
using UnityEngine.UI;

public class MainMenu : MonoBehaviour
{
    public TCP tcp;
    public Transform canvas;
    public Game game;
    public Camera mainCamera;

    [Header("Screens")]
    public GameObject waitingScreen;
    public GameObject welcomeScreen;
    public GameObject connectScreen;
    public GameObject regScreen;
    public GameObject loginScreen;
    public GameObject mainMenuScreen;
    public GameObject gameCreatedScreen;
    public GameObject continueGameScreen;
    public GameObject gameScreen;
    public GameObject gameBoard;

    [Header("Waiting")]
    public Text waitingText;

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
    public GameObject shareButton;

    [Header("Continue Game")]
    public Transform scrollRect;
    public GameObject buttonPrefab;

    [Header("Join Game")]
    public InputField joinGameId;

    private string gameId;
    private int colour = -1;
    private string username;

    void Awake()
    {
        tcp.SubscribeGameUpdate(GameUpdate);
        tcp.SubscribeConnect(ConnectionResult);

        float targetRatio = 16 / 9f;
        float ratio = Screen.height > Screen.width ? Screen.height / (float)Screen.width : Screen.width / (float)Screen.height;
        mainCamera.orthographicSize *= (ratio / targetRatio);
    }

    void ConnectionResult(bool connected)
    {
        gameBoard.SetActive(false);
        gameScreen.SetActive(false);
        for (int i = 0; i < canvas.childCount - 1; i++)
            canvas.GetChild(i).gameObject.SetActive(false);

        if (connected)
        {
            LoadLoginInfo();
            welcomeScreen.SetActive(true);
            waitingText.text = "Waiting...";
        }
        else
            connectScreen.SetActive(true);
    }

    void LoadLoginInfo()
    {
        if (PlayerPrefs.HasKey("username"))
            loginUserField.text = PlayerPrefs.GetString("username");

        if (PlayerPrefs.HasKey("password"))
            loginPasswordField.text = PlayerPrefs.GetString("password");
    }

    public void Connect()
    {
        waitingText.text = "Connecting...";
        ShowWaiting();
        tcp.TryToConnect();
    }

    public void Register()
    {
        print(true);
        ShowWaiting();
        username = regUserField.text;
        tcp.LoginRegister(false, regUserField.text, regPasswordField.text, RegisterResult);
    }

    void RegisterResult(bool result)
    {
        if (result)
        {
            mainMenuScreen.SetActive(true);
            PlayerPrefs.SetString("username", regUserField.text);
            PlayerPrefs.SetString("password", regPasswordField.text);
            PlayerPrefs.Save();
            Toast.ShowMessage("Registered");
        }
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
        {
            PlayerPrefs.SetString("username", loginUserField.text);
            PlayerPrefs.SetString("password", loginPasswordField.text);
            PlayerPrefs.Save();
            mainMenuScreen.SetActive(true);
        }
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

            shareButton.SetActive(Application.platform == RuntimePlatform.Android);
        }

        waitingScreen.SetActive(false);
    }

    public void Share()
    {
        ShareApp.ShareText(gameId);
    }

    public void StartGame()
    {
        GoToGame(new Game.GameData(null, 0, colour == 0 ? username : null, colour == 1 ? username : null, -1));
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
        colour = -1;
        tcp.JoinResumeGame(gameId, GoToGame);
    }

    public void JoinGame()
    {
        if (!string.IsNullOrEmpty(joinGameId.text) && joinGameId.text.Length == 5)
        {
            ShowWaiting();
            gameId = joinGameId.text.ToUpper();
            tcp.JoinResumeGame(gameId, GoToGame);
        }
    }

    void GameUpdate(string gameId)
    {
        if (this.gameId.ToUpper() == gameId.ToUpper() && gameBoard.activeSelf)
        {
            ShowWaiting();
            RemoveGamesList();
            tcp.JoinResumeGame(gameId, GoToGame);
            Toast.ShowMessage("Your turn");
        }
        else
            Toast.ShowMessage("Your turn in game: " + gameId);
    }

    void GoToGame(Game.GameData gameData)
    {
        if (gameId != null && !(gameData.blue == null && gameData.white == null))
        {
            for (int i = 0; i < canvas.childCount - 1; i++)
                canvas.GetChild(i).gameObject.SetActive(false);

            if (gameData.blue == username)
                colour = 0;
            else if (gameData.white == username)
                colour = 1;

            if (gameData.winner != -1)
                if (gameData.winner == colour)
                    Toast.ShowMessage("Winner Winner Chicken Dinner!");
                else
                    Toast.ShowMessage("Better luck next time");

            game.OpenGame(gameId, gameData.grid, gameData.turn, colour, gameData.blue, gameData.white, gameData.winner);
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
