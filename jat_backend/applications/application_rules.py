class ApplicationRuleValidationError(ValueError):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("Application data does not satisfy the business rules.")


def get_next_step(vacancy_status, outside_eu_response):
    if vacancy_status == "current":
        return "Apply now"

    return {
        "yes_open": "Target",
        "maybe": "Re-contact later",
        "no": "Remove for now",
    }.get(outside_eu_response, "Speculative")


def clean_application_fields(
    *,
    keywords,
    english_requirement,
    english_level,
    german_requirement,
    german_level,
    other_requirements,
    vacancy_status,
    outside_eu_response,
    hiring_pattern,
):
    errors = {}

    if isinstance(keywords, list):
        cleaned_keywords = [
            item.strip()
            for item in keywords
            if isinstance(item, str) and item.strip()
        ]
        if not 5 <= len(cleaned_keywords) <= 17:
            errors["keywords"] = "Enter between 5 and 17 keywords."
    else:
        cleaned_keywords = []
        errors["keywords"] = "Keywords must be a list."

    if isinstance(other_requirements, list):
        cleaned_requirements = [
            item.strip()
            for item in other_requirements
            if isinstance(item, str) and item.strip()
        ]
        if len(set(cleaned_requirements)) < 7:
            errors["other_requirements"] = (
                "Select at least 7 other requirements."
            )
        cleaned_requirements = list(dict.fromkeys(cleaned_requirements))
    else:
        cleaned_requirements = []
        errors["other_requirements"] = "Other requirements must be a list."

    if vacancy_status == "current":
        if outside_eu_response:
            errors["outside_eu_response"] = (
                "Outside-EU answer is only used when there is no current vacancy."
            )
        if hiring_pattern:
            errors["hiring_pattern"] = (
                "Hiring pattern is only used for a speculative target."
            )
    elif vacancy_status == "none":
        if outside_eu_response not in {"yes_open", "maybe", "no"}:
            errors["outside_eu_response"] = (
                "Select an answer for a speculative application."
            )
        elif outside_eu_response == "yes_open":
            if hiring_pattern not in {"Q4", "Q1", "Mid-year"}:
                errors["hiring_pattern"] = (
                    "Select a hiring pattern when the answer is Yes / open."
                )
        elif hiring_pattern:
            errors["hiring_pattern"] = (
                "Hiring pattern is only used when the answer is Yes / open."
            )
    else:
        errors["vacancy_status"] = "Select a valid vacancy status."

    _validate_language("english", english_requirement, english_level, errors)
    _validate_language("german", german_requirement, german_level, errors)

    if errors:
        raise ApplicationRuleValidationError(errors)

    return {
        "keywords": cleaned_keywords,
        "other_requirements": cleaned_requirements,
        "vacancy_status": vacancy_status,
        "outside_eu_response": outside_eu_response,
        "hiring_pattern": hiring_pattern,
    }


def _validate_language(field, requirement, level, errors):
    level_field = f"{field}_level"
    valid_levels = {"Beginner", "Intermediate", "Advanced"}

    if requirement == "Yes" and level not in valid_levels:
        errors[level_field] = (
            "Select Beginner, Intermediate, or Advanced "
            "when requirement is Yes."
        )

    if requirement != "Yes" and level:
        errors[level_field] = (
            "Language level must be empty unless requirement is Yes."
        )
