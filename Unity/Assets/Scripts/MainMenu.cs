using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class MainMenu : MonoBehaviour
{
    public TCP tcp;
    public Transform canvas;
    public GameObject waitingScreen;

    [Header("Login")]
    public InputField loginUserField;
    public InputField loginPasswordField;

    [Header("Register")]
    public InputField regUserField;
    public InputField regPasswordField;

    public void Register()
    {
        tcp.LoginRegister(false, regUserField.text, regPasswordField.text, RegisterResult);
        ShowWaiting();
    }

    void RegisterResult(bool result)
    {
        print(result);
        if (result)
        {

        }
        else
        {

        }
    }

    public void Login()
    {
        tcp.LoginRegister(true, loginUserField.text, loginPasswordField.text, LoginResult);
        ShowWaiting();
    }

    void LoginResult(bool result)
    {
        print(result);
        if (result)
        {

        }
        else
        {

        }
    }

    void ShowWaiting()
    {
        for (int i = 0; i < canvas.childCount; i++)
            canvas.GetChild(i).gameObject.SetActive(false);

        waitingScreen.SetActive(true);
    }
}
