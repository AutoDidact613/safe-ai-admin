import { resolveOrCreateTagByName, resolveOrCreateTagsByNames } from '../../services/tagService';
import Tag from '../../models/Tag';

jest.mock('../../models/Tag');

describe('resolveOrCreateTagByName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('מחזיר את ה-id של תגית קיימת בלי ליצור תגית כפולה', async () => {
    (Tag.findOne as jest.Mock).mockResolvedValue({ _id: 'existing-id-123' });

    const result = await resolveOrCreateTagByName('React');

    expect(Tag.findOne).toHaveBeenCalled();
    expect(Tag.create).not.toHaveBeenCalled();
    expect(result).toBe('existing-id-123');
  });

  test('יוצר תגית חדשה כשהיא עדיין לא קיימת במאגר', async () => {
    (Tag.findOne as jest.Mock).mockResolvedValue(null);
    (Tag.create as jest.Mock).mockResolvedValue({ _id: 'new-id-456' });

    const result = await resolveOrCreateTagByName('TypeScript');

    expect(Tag.create).toHaveBeenCalledWith({ name: 'TypeScript' });
    expect(result).toBe('new-id-456');
  });

  test('מחזיר null עבור שם ריק/רווחים בלבד, בלי לפנות ל-DB בכלל', async () => {
    const result = await resolveOrCreateTagByName('   ');

    expect(result).toBeNull();
    expect(Tag.findOne).not.toHaveBeenCalled();
  });
});

describe('resolveOrCreateTagsByNames', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('מחזיר מערך IDs עבור כל שמות התגיות שהתקבלו', async () => {
    (Tag.findOne as jest.Mock).mockResolvedValue(null);
    (Tag.create as jest.Mock)
      .mockResolvedValueOnce({ _id: 'id-1' })
      .mockResolvedValueOnce({ _id: 'id-2' });

    const ids = await resolveOrCreateTagsByNames(['Node.js', 'MongoDB']);

    expect(ids).toEqual(['id-1', 'id-2']);
  });

  test('מדלג על שמות ריקים בתוך המערך (למשל אם ה-AI החזיר מחרוזת ריקה)', async () => {
    (Tag.findOne as jest.Mock).mockResolvedValue({ _id: 'id-1' });

    const ids = await resolveOrCreateTagsByNames(['React', '', '   ']);

    expect(ids).toEqual(['id-1']);
  });
});