using UnityEngine;
using UnityEngine.UI;

public class Toast : MonoBehaviour
{
    public float displayTime = 1.5f;
    public AnimationCurve fade = AnimationCurve.EaseInOut(0, 1, 1, 0);

    private Text toastText;
    private CanvasGroup canvasGroup;

    private float startTime;
    private bool showing;

    private static Toast instance;

    void Start()
    {
        instance = this;
        toastText = GetComponentInChildren<Text>();
        canvasGroup = GetComponent<CanvasGroup>();
    }

    void Update()
    {
        if (!showing)
            return;

        float pct = (Time.time - startTime) / displayTime;
        pct = Mathf.Clamp01(pct);
        canvasGroup.alpha = fade.Evaluate(pct);

        if (pct == 1)
        {
            showing = false;
            canvasGroup.alpha = 0;
        }
    }

    public static void ShowMessage(string message)
    {
        instance.toastText.text = message;
        instance.startTime = Time.time;
        instance.canvasGroup.alpha = instance.fade.Evaluate(0);
        instance.showing = true;
    }
}
