from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0013_candidatecv"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="english_level",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A1", "A1"),
                    ("A2", "A2"),
                    ("B1", "B1"),
                    ("B2", "B2"),
                    ("C1", "C1"),
                    ("C2", "C2"),
                ],
                default="",
                max_length=2,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="german_level",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A1", "A1"),
                    ("A2", "A2"),
                    ("B1", "B1"),
                    ("B2", "B2"),
                    ("C1", "C1"),
                    ("C2", "C2"),
                ],
                default="",
                max_length=2,
            ),
        ),
    ]
