from graph import graph


def main():
    result = graph.invoke({})
    print(result["summary"])


if __name__ == "__main__":
    main()