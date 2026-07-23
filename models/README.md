# Model Weights

Model weights are NOT included in this repository due to their large size.

## Download Instructions

| Model | Path | Size | Source |
|---|---|---|---|
| Violence Detection (VideoMAE) | `models/model1/videomae_model1_best.pth` | ~329 MB | Trained model — contact author |
| Distress Detection (VideoMAE) | `models/model2/videomae_model2_best.pth` | ~329 MB | Trained model — contact author |
| Person Detection (YOLO11n) | `models/model3a/yolo11n.pt` | ~5.6 MB | **Included in repo** |
| Gender Classification (EfficientNetV2-S) | `models/model4/gender_detection_best.pth` | ~78 MB | Trained model — contact author |

## Gender Model Details

- **Architecture:** `timm.create_model("tf_efficientnetv2_s", pretrained=False, num_classes=2)`
- **Training Dataset:** PA-100K pedestrian attribute recognition (100,000 images)
- **Input:** 224×224, ImageNet normalization (mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
- **Classes:** 0 = Male, 1 = Female
- **Val Accuracy:** 94.69%

## VideoMAE Model Details

- **Base:** `MCG-NJU/videomae-base-finetuned-kinetics` (HuggingFace)
- **Model 1 Classes:** Normal, Violence (3-class fine-tuned)
- **Model 2 Classes:** Normal, Walking, Running, Punching, Violence, Fall, SOS (7-class)

## Recreating from Scratch

To retrain the gender model, use the training notebook (`gendermodel.ipynb`) on the PA-100K dataset from Kaggle.

To retrain the VideoMAE models, fine-tune from `MCG-NJU/videomae-base-finetuned-kinetics` on your labeled video dataset.
