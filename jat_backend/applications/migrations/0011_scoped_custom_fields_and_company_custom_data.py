from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0010_remove_customfielddefinition_is_filterable"),
    ]

    operations = [
        migrations.AddField(
            model_name="customfielddefinition",
            name="scope",
            field=models.CharField(
                choices=[
                    ("application", "Application"),
                    ("company", "Company"),
                ],
                default="application",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="company",
            name="custom_data",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RemoveConstraint(
            model_name="customfielddefinition",
            name="unique_custom_field_key_per_user",
        ),
        migrations.RemoveConstraint(
            model_name="customfielddefinition",
            name="unique_custom_field_name_per_user",
        ),
        migrations.AddConstraint(
            model_name="customfielddefinition",
            constraint=models.UniqueConstraint(
                fields=("user", "scope", "key"),
                name="unique_custom_field_key_per_scope",
            ),
        ),
        migrations.AddConstraint(
            model_name="customfielddefinition",
            constraint=models.UniqueConstraint(
                fields=("user", "scope", "name"),
                name="unique_custom_field_name_per_scope",
            ),
        ),
    ]
