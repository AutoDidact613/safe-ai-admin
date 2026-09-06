from unittest.mock import MagicMock, patch

from google.genai import errors as genai_errors

from index_articles import index_articles


def _article(slug="foo", title="Foo", content="bar", category="general"):
    return {"slug": slug, "title": title, "content": content, "category": category}


@patch("index_articles.embed_text")
def test_index_articles_upserts_each_article_by_slug(embed_text_mock):
    embed_text_mock.return_value = [0.1, 0.2]
    client = MagicMock()
    client.fetch_all_articles.return_value = [_article(slug="a"), _article(slug="b")]
    collection = MagicMock()

    indexed, failed, total = index_articles(client, collection, MagicMock())

    assert (indexed, failed, total) == (2, 0, 2)
    assert collection.update_one.call_count == 2
    first_call = collection.update_one.call_args_list[0]
    assert first_call.args[0] == {"slug": "a"}
    assert first_call.args[1]["$set"]["vector"] == [0.1, 0.2]
    assert first_call.kwargs["upsert"] is True


@patch("index_articles.embed_text")
def test_index_articles_counts_embedding_failures_without_stopping(embed_text_mock):
    embed_text_mock.side_effect = [
        genai_errors.APIError(500, {"message": "boom"}),
        [0.1, 0.2],
    ]
    client = MagicMock()
    client.fetch_all_articles.return_value = [_article(slug="a"), _article(slug="b")]
    collection = MagicMock()

    indexed, failed, total = index_articles(client, collection, MagicMock())

    assert (indexed, failed, total) == (1, 1, 2)
    collection.update_one.assert_called_once()
