"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  checkGeppoConnection,
  getGeppoFilterOptions,
  searchGeppoWorkEntries,
  exportGeppoToCsv,
} from "./geppo-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  RefreshCw,
  Download,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Project } from "@/types/project";

interface Geppo {
  id: number;
  userId: string;
  projectName: string;
  yyyyMM: string;
  taskName: string;
  wbsId: string;
  biko: string;
  status: string;
  day01: number;
  day02: number;
  day03: number;
  day04: number;
  day05: number;
  day06: number;
  day07: number;
  day08: number;
  day09: number;
  day10: number;
  day11: number;
  day12: number;
  day13: number;
  day14: number;
  day15: number;
  day16: number;
  day17: number;
  day18: number;
  day19: number;
  day20: number;
  day21: number;
  day22: number;
  day23: number;
  day24: number;
  day25: number;
  day26: number;
  day27: number;
  day28: number;
  day29: number;
  day30: number;
  day31: number;
}

interface SearchFilters {
  projectCode: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
  department: string;
  taskCategory: string;
}

interface FilterOptions {
  projects: Project[];
}

export default function GeppoPage() {
  const [entries, setEntries] = useState<Geppo[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(
    null
  );

  const [filters, setFilters] = useState<SearchFilters>({
    projectCode: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    department: "",
    taskCategory: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // 初期データ読み込み
  useEffect(() => {
    void loadFilterOptions();
    void checkConnection();
  }, []);

  // データベース接続テスト
  const checkConnection = async () => {
    try {
      const result = await checkGeppoConnection();
      setConnectionStatus(result.connected);
    } catch {
      setConnectionStatus(false);
    }
  };

  // フィルタオプション読み込み
  const loadFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const result = await getGeppoFilterOptions();

      if (result.success) {
        setFilterOptions(result.filterOptions);
      } else {
        setError(result.error || "フィルタオプションの読み込みに失敗しました");
      }
    } catch {
      setError("フィルタオプションの読み込み中にエラーが発生しました");
    } finally {
      setLoadingFilters(false);
    }
  };

  // 作業実績検索
  const searchEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchGeppoWorkEntries(filters, {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: "yyyyMM",
        sortOrder: "desc",
      });

      if (result.success) {
        setEntries(
          result.result.geppos.map((entry: Geppo) => ({
            ...entry,
            workDate: new Date(entry.yyyyMM),
          }))
        );
        setPagination((prev) => ({
          ...prev,
          total: result.result.total,
          totalPages: result.result.totalPages,
        }));
      } else {
        setError(result.error || "検索に失敗しました");
        setEntries([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
      }
    } catch {
      setError("検索中にエラーが発生しました");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // 検索実行
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    void searchEntries();
  };

  // ページ変更
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void searchEntries();
  };

  // フィルタリセット
  const resetFilters = () => {
    setFilters({
      projectCode: "",
      userId: "",
      dateFrom: "",
      dateTo: "",
      department: "",
      taskCategory: "",
    });
    setEntries([]);
    setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 0 }));
  };

  // CSVエクスポート
  const exportToCsv = async () => {
    try {
      const result = await exportGeppoToCsv(filters);

      if (result.success && result.csvContent) {
        // Blobを作成してダウンロード
        const blob = new Blob([result.csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          result.filename ||
          `geppo_export_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(result.error || "エクスポートに失敗しました");
      }
    } catch {
      setError("エクスポート中にエラーが発生しました");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Geppo月報データ</h1>
        <div className="flex items-center space-x-4">
          <p className="text-muted-foreground">
            MySQLのgeppoデータベースから作業実績データを検索・表示します
          </p>
          {connectionStatus !== null && (
            <Badge
              variant={connectionStatus ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span>{connectionStatus ? "接続済み" : "接続エラー"}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 検索フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>検索条件</span>
          </CardTitle>
          <CardDescription>
            プロジェクトやユーザーで絞り込んで作業実績を検索できます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingFilters ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>フィルタオプションを読み込み中...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>プロジェクト</Label>
                  <Select
                    value={filters.projectCode || "_all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        projectCode: value === "_all" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="プロジェクトを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全て</SelectItem>
                      {filterOptions.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* <div className="space-y-2">
                  <Label>ユーザー</Label>
                  <Select
                    value={filters.userId || "_all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        userId: value === "_all" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ユーザーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全て</SelectItem>
                      {filterOptions.users.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.userKanji} ({user.userId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateFrom: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="mr-2 h-4 w-4" />
                    検索
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    リセット
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => void loadFilterOptions()}
                    disabled={loadingFilters}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    更新
                  </Button>
                  {entries.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => void exportToCsv()}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      CSV出力
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 検索結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>作業実績</span>
              {pagination.total > 0 && (
                <Badge variant="secondary">
                  {pagination.total.toLocaleString()}件
                </Badge>
              )}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  前へ
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  次へ
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>検索中...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">データが見つかりません</p>
              <p>検索条件を変更して再度お試しください</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業日</TableHead>
                    <TableHead>プロジェクト</TableHead>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>開始時刻</TableHead>
                    <TableHead>終了時刻</TableHead>
                    <TableHead className="text-right">休憩時間</TableHead>
                    <TableHead className="text-right">作業時間</TableHead>
                    <TableHead>作業内容</TableHead>
                    <TableHead>カテゴリ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow
                      key={`${entry.id}-${entry.userId}-${entry.yyyyMM}-${index}`}
                    >
                      <TableCell className="font-mono">
                        {entry.yyyyMM}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.projectName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.userId}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.userId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{entry.day01}</TableCell>
                      <TableCell className="font-mono">{entry.day02}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.day03}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex items-center justify-end space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{entry.day04}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={entry.biko}>
                          {entry.biko}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ページネーション（下部） */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1 || loading}
            >
              最初
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              前へ
            </Button>
            <span className="px-4 py-2 text-sm">
              {pagination.page} / {pagination.totalPages} ページ
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              次へ
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              最後
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
