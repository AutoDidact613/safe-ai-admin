/**
 * בונה את שלבי האגרגציה שמגיעים *אחרי* ה-$match (מיון, דילוג/הגבלה,
 * וחיבור author/tags/comments) - כדי שאפשר יהיה להשתמש בהם גם בתוך
 * $facet (ראו buildPostListWithCount למטה) וגם בנפרד (כמו בחיפוש).
 */
function buildPostListStages(skip?: number, limit?: number) {
  const stages: any[] = [{ $sort: { lastActivity: -1 } }];

  if (typeof skip === 'number') stages.push({ $skip: skip });
  if (typeof limit === 'number') stages.push({ $limit: limit });

  stages.push(
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'author'
      }
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'tags',
        localField: 'tags',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'tags'
      }
    },

    {
      $lookup: {
        from: 'comments',
        let: { postId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'author'
            }
          },
          { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
          { $project: { content: 1, 'author.name': 1 } }
        ],
        as: 'comments'
      }
    },

    {
      $addFields: {
        commentCount: { $size: '$comments' },
        lastComment: {
          $cond: [
            { $gt: [{ $size: '$comments' }, 0] },
            {
              authorName: { $ifNull: [{ $arrayElemAt: ['$comments.author.name', 0] }, 'משתמש'] },
              content: { $arrayElemAt: ['$comments.content', 0] }
            },
            null
          ]
        }
      }
    },

    { $project: { comments: 0 } }
  );

  return stages;
}

/**
 * בונה pipeline מלא (עם $match) לרשימת פוסטים - לשימוש כשלא צריך ספירה
 * כוללת (למשל תוצאות חיפוש, שלא היו עם pagination גם קודם).
 */
export function buildPostListPipeline(matchStage: Record<string, any>, skip?: number, limit?: number) {
  return [{ $match: matchStage }, ...buildPostListStages(skip, limit)];
}

/**
 * בונה pipeline יחיד שמחזיר גם את רשימת הפוסטים לעמוד הנוכחי וגם את הספירה
 * הכוללת - הכול בקריאה אחת למסד הנתונים (במקום countDocuments + aggregate
 * כשתי שאילתות נפרדות כמו שהיה קודם).
 *
 * מחזיר מסמך יחיד בצורת: { data: [...], totalCount: N }
 */
export function buildPostListWithCountPipeline(matchStage: Record<string, any>, skip: number, limit: number) {
  return [
    { $match: matchStage },
    {
      $facet: {
        data: buildPostListStages(skip, limit),
        totalCount: [{ $count: 'count' }]
      }
    },
    {
      $project: {
        data: 1,
        totalCount: { $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0] }
      }
    }
  ];
}