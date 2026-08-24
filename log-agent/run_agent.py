from graph import graph


def format_summary(summary: dict) -> str:
    """
    Formats a request-type-to-count dict as a readable table for the terminal.
    """
    lines = ["Contact Form Summary", "---------------------"]
 
    for request_type, count in summary.items():
        lines.append(f"{request_type:<18}{count}")
 
    lines.append("---------------------")
    lines.append(f"{'Total:':<18}{sum(summary.values())}")
 
    return "\n".join(lines)


def main():
    result = graph.invoke({})
    print(format_summary(result["summary"]))


if __name__ == "__main__":
    main()