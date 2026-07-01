import { Request, Response } from "express";
import { newsService } from "../services/newsService";

type NewsParams = {
  id: string;
};

export const newsController = {
  // GET /api/news
  async getAllNews(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Number(req.query.limit) || 10);

      const news = await newsService.getAllNews(page, limit);
      return res.status(200).json(news);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Internal server error",
      });
    }
  },

  // GET /api/news/:id
  async getNewsById(req: Request<NewsParams>, res: Response) {
    try {
      const news = await newsService.getNewsById(req.params.id);

      return res.status(200).json(news);
    } catch (error: any) {
      return res.status(404).json({
        message: error.message,
      });
    }
  },

  // POST /api/news
  async createNews(req: Request, res: Response) {
    try {
      const news = await newsService.createNews(req.body);

      return res.status(201).json(news);
    } catch (error: any) {
      return res.status(400).json({
        message: error.message,
      });
    }
  },

  // PUT /api/news/:id
  async updateNews(req: Request<NewsParams>, res: Response) {
    try {
      const news = await newsService.updateNews(req.params.id, req.body);

      return res.status(200).json(news);
    } catch (error: any) {
      return res.status(404).json({
        message: error.message,
      });
    }
  },

  // DELETE /api/news/:id
  async deleteNews(req: Request<NewsParams>, res: Response) {
    try {
      await newsService.deleteNews(req.params.id);

      return res.status(200).json({
        message: "News deleted successfully",
      });
    } catch (error: any) {
      return res.status(404).json({
        message: error.message,
      });
    }
  },
};
