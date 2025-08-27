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
  AlertTriangle,
  Loader2,
  Upload,
} from "lucide-react";
import { Project } from "@/types/project";
import { User } from "@/types/user";
import { Geppo } from "@/domains/geppo/types";
import { MonthPicker } from "@/components/month-picker";
import Link from "next/link";

interface SearchFilters {
  PROJECT_ID: string;
  MEMBER_ID: string;
  dateFrom: string;
  dateTo: string;
}

interface FilterOptions {
  projects: Project[];
  users: User[];
}

export default function GeppoPage() {
  const [entries, setEntries] = useState<Geppo[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(
    null
  );

  const [filters, setFilters] = useState<SearchFilters>({
    PROJECT_ID: "",
    MEMBER_ID: "",
    dateFrom: "",
    dateTo: "",
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
        sortBy: "GEPPO_YYYYMM",
        sortOrder: "desc",
      });

      if (result.success) {
        setEntries(result.result.geppos);
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
      PROJECT_ID: "",
      MEMBER_ID: "",
      dateFrom: "",
      dateTo: "",
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
          <div className="flex items-center space-x-4">
            <Link href="/work-records/geppo-import">
              <Button>
                <Upload className="h-4 w-4" />
                月報データ取込
              </Button>
            </Link>
          </div>
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
                    value={filters.PROJECT_ID || "_all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        PROJECT_ID: value === "_all" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="プロジェクトを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全て</SelectItem>
                      {filterOptions.projects.map((project) => (
                        <SelectItem key={project.name} value={project.name}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ユーザー</Label>
                  <Select
                    value={filters.MEMBER_ID || "_all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        MEMBER_ID: value === "_all" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ユーザーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全て</SelectItem>
                      {filterOptions.users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>開始月</Label>
                  <MonthPicker
                    value={filters.dateFrom}
                    onChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateFrom: value,
                      }))
                    }
                    placeholder="開始月を選択"
                  />
                </div>

                <div className="space-y-2">
                  <Label>終了月</Label>
                  <MonthPicker
                    value={filters.dateTo}
                    onChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateTo: value,
                      }))
                    }
                    placeholder="終了月を選択"
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
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">作業日</TableHead>
                    <TableHead className="whitespace-nowrap">
                      プロジェクト
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      ユーザー
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      タスク名
                    </TableHead>
                    <TableHead className="whitespace-nowrap">WBS ID</TableHead>
                    <TableHead className="whitespace-nowrap">
                      ステータス
                    </TableHead>
                    <TableHead className="whitespace-nowrap">備考</TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      1日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      2日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      3日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      4日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      5日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      6日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      7日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      8日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      9日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      10日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      11日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      12日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      13日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      14日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      15日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      16日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      17日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      18日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      19日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      20日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      21日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      22日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      23日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      24日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      25日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      26日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      27日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      28日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      29日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      30日
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center min-w-[60px]">
                      31日
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow
                      key={`${entry.MEMBER_ID}-${entry.GEPPO_YYYYMM}-${entry.ROW_NO}-${index}`}
                    >
                      <TableCell className="font-mono whitespace-nowrap">
                        {entry.GEPPO_YYYYMM}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="min-w-[200px]">
                          <div
                            className="font-medium truncate"
                            title={entry.PROJECT_ID}
                          >
                            {entry.PROJECT_ID}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="min-w-[120px]">
                          <div
                            className="font-medium truncate"
                            title={entry.MEMBER_NAME || entry.MEMBER_ID}
                          >
                            {entry.MEMBER_NAME || entry.MEMBER_ID}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div
                          className="min-w-[200px] truncate"
                          title={entry.WORK_NAME}
                        >
                          {entry.WORK_NAME}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div
                          className="min-w-[200px] truncate"
                          title={entry.WBS_NO}
                        >
                          {entry.WBS_NO}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline">{entry.WORK_STATUS}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div
                          className="min-w-[200px] truncate"
                          title={entry.WBS_NAME}
                        >
                          {entry.WBS_NAME}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day01}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day02}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day03}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day04}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day05}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day06}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day07}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day08}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day09}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day10}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day11}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day12}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day13}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day14}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day15}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day16}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day17}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day18}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day19}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day20}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day21}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day22}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day23}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day24}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day25}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day26}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day27}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day28}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day29}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day30}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap text-center">
                        {entry.day31}
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
