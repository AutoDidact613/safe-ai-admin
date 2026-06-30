import { INews } from "../models/news";
import { newsRepository } from "../repositories/newsRepository";
import logger from "../logger";

export const newsService = {
  // Get all news
  async getAllNews(page = 1, limit = 10): Promise<INews[]> {
    logger.info("Fetching all news");
    return await newsRepository.findAll(page, limit);
  },

  // Get news by ID
  async getNewsById(id: string): Promise<INews> {
    logger.info("Fetching news by ID", { id });
    const news = await newsRepository.findById(id);

    if (!news) {
      throw new Error("News not found");
    }

    return news;
  },

  // Create news
  async createNews(data: Partial<INews>): Promise<INews> {
    logger.info("Creating news", { data });
    if (!data.title?.trim()) {
      throw new Error("Title is required");
    }

    if (!data.content?.trim()) {
      throw new Error("Content is required");
    }

    const createData = {
      ...data,
      tags: data.tags || [],
    };

    logger.info("News created successfully", { createData });
    return await newsRepository.create(createData);
  },

  // Update news
  async updateNews(id: string, data: Partial<INews>): Promise<INews> {
    logger.info("Updating news", { id, data });
    const updatedNews = await newsRepository.update(id, data);

    if (!updatedNews) {
      throw new Error("News not found");
    }

    logger.info("News updated successfully", { id });
    return updatedNews;
  },

  // Delete news
  async deleteNews(id: string): Promise<void> {
    logger.info("Deleting news", { id });
    const deletedNews = await newsRepository.delete(id);

    if (!deletedNews) {
      throw new Error("News not found");
    }

    logger.info("News deleted successfully", { id });
  },


};