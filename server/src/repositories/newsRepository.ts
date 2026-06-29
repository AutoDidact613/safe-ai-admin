import { INews, News } from "../models/news";

export const newsRepository = {
  // Get all news (newest first)
  async findAll(): Promise<INews[]> {
    return await News.find().sort({ createdAt: -1 });
  },

  // Get news by ID
  async findById(id: string): Promise<INews | null> {
    return await News.findById(id);
  },

  // Create news
  async create(data: Partial<INews>): Promise<INews> {
    return await News.create(data);
  },

  // Update news
  async update(id: string, data: Partial<INews>): Promise<INews | null> {
    return await News.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  },

  // Delete news
  async delete(id: string): Promise<INews | null> {
    return await News.findByIdAndDelete(id);
  },
};