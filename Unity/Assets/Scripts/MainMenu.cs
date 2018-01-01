using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class MainMenu : MonoBehaviour
{
    public TCP tcp;
    public Transform canvas;

    [Header("Screens")]
    public GameObject waitingScreen;
    public GameObject regScreen;
    public GameObject loginScreen;
    public GameObject mainMenuScreen;

    [Header("Login")]
    public InputField loginUserField;
    public InputField loginPasswordField;

    [Header("Register")]
    public InputField regUserField;
    public InputField regPasswordField;

    [Header("Create Game")]
    public Dropdown colourDropdown;

    public void Register()
    {
        tcp.LoginRegister(false, regUserField.text, regPasswordField.text, RegisterResult);
        ShowWaiting();
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
        tcp.LoginRegister(true, loginUserField.text, loginPasswordField.text, LoginResult);
        ShowWaiting();
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
        int colour = colourDropdown.value;
        tcp.CreateGame(colour, CreateGameResult);
        ShowWaiting();
    }

    void CreateGameResult(string gameId)
    {
        if (string.IsNullOrEmpty(gameId))
        {
            // fail
        }
        else
        {
            // success
        }
        print(gameId);
    }

    void ShowWaiting()
    {
        for (int i = 0; i < canvas.childCount; i++)
            canvas.GetChild(i).gameObject.SetActive(false);

        waitingScreen.SetActive(true);
    }
}
