"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { CompanyHolidayForm } from "@/app/company-holidays/company-holiday-form";
import { formatDate as formatDateUtil } from "@/utils/date-util";
import { getCompanyHolidays, deleteCompanyHoliday } from "./actions";
import { useToast } from "@/hooks/use-toast";
import type { CompanyHolidayDto, CompanyHolidayType } from "@/types/company-holiday";

export default function CompanyHolidaysPage() {
  const [holidays, setHolidays] = useState<CompanyHolidayDto[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHolidayDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyHolidayDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 休日タイプの表示名とバッジ色
  const getHolidayTypeLabel = (type: CompanyHolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "国民の祝日";
      case "COMPANY":
        return "会社休日";
      case "SPECIAL":
        return "特別休日";
      default:
        return type;
    }
  };

  const getHolidayTypeBadgeVariant = (type: CompanyHolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "destructive";
      case "COMPANY":
        return "default";
      case "SPECIAL":
        return "secondary";
      default:
        return "outline";
    }
  };

  // 休日データの取得
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const data = await getCompanyHolidays();
      setHolidays(data);
    } catch (error) {
      console.error("休日データの取得中にエラーが発生しました:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "休日データの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 休日の削除
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const result = await deleteCompanyHoliday(deleteTarget.id);
      if (result.success) {
        setHolidays((prev) => prev.filter((h) => h.id !== deleteTarget.id));
        toast({ title: "会社休日を削除しました" });
      } else {
        toast({
          variant: "destructive",
          title: "削除に失敗しました",
          description: result.error,
        });
      }
    } catch (error) {
      console.error("削除中にエラーが発生しました:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "削除中にエラーが発生しました",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // 新規登録・編集フォームを開く
  const handleOpenForm = (holiday?: CompanyHolidayDto) => {
    setEditingHoliday(holiday || null);
    setIsFormOpen(true);
  };

  // フォームを閉じる
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHoliday(null);
  };

  // 休日の保存後の処理
  const handleSaveSuccess = () => {
    handleCloseForm();
    fetchHolidays(); // データを再取得
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) =>
    formatDateUtil(new Date(dateString), "YYYY/MM/DD(曜)");

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>会社休日管理</CardTitle>
              <CardDescription>
                会社の休日を管理します。営業日案分計算に使用されます。
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              新規追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>休日名</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      登録されている休日がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        {formatDate(holiday.date)}
                      </TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell>
                        <Badge variant={getHolidayTypeBadgeVariant(holiday.type)}>
                          {getHolidayTypeLabel(holiday.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {holiday.createdAt
                          ? new Date(holiday.createdAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenForm(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(holiday)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新規登録・編集フォーム */}
      {isFormOpen && (
        <CompanyHolidayForm
          holiday={editingHoliday}
          onClose={handleCloseForm}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この休日を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
