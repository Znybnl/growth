"use client";

import {
  BarChart3,
  CopyPlus,
  Download,
  Eye,
  ImageIcon,
  Mail,
  MoreVertical,
  QrCode,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";

import { openCampaignPreview } from "@/lib/game-preview-viewport";
import { DuplicateCampaignButton } from "@/components/merchant/duplicate-campaign-button";
import { DownloadFeedbackDialog, downloadBlob, fetchDownload, useDownloadTask } from "@/components/merchant/download-feedback";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CampaignActionsMenuProps = {
  campaignId: string;
  campaignTitle: string;
  isActive?: boolean;
  allowAdminDuplicate?: boolean;
};

const itemClass =
  "min-h-9 cursor-pointer gap-2 rounded-[4px] px-2.5 py-2 text-sm font-medium text-graphite focus:bg-purple-haze";

const CampaignPreviewDialog = dynamic(() => import("./campaign-preview-dialog").then((module) => module.CampaignPreviewDialog));
const CampaignQrDownloadDialog = dynamic(() => import("./campaign-qr-download").then((module) => module.CampaignQrDownloadDialog));
const DeleteCampaignDialog = dynamic(() => import("./delete-campaign-button").then((module) => module.DeleteCampaignDialog));
const DuplicateCampaignToLocationsDialog = dynamic(() =>
  import("./duplicate-campaign-to-locations-button").then((module) => module.DuplicateCampaignToLocationsDialog));
const AdminDuplicateCampaignDialog = dynamic(() => import("@/components/merchant/admin-duplicate-campaign-button").then((module) => module.AdminDuplicateCampaignDialog));

export function CampaignActionsMenu({
  campaignId,
  campaignTitle,
  isActive,
  allowAdminDuplicate = false,
}: CampaignActionsMenuProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDuplicateLocationsOpen, setIsDuplicateLocationsOpen] = useState(false);
  const [isAdminDuplicateOpen, setIsAdminDuplicateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const posterTask = useDownloadTask();
  const downloadPoster = () => void posterTask.start(async (signal) => {
    const id = encodeURIComponent(campaignId);
    const blob = await fetchDownload(`/api/campaigns/${id}/poster`, signal, "image/png");
    downloadBlob(blob, `${id}-affiche-a4-a5.png`);
    return "L’affiche a été transmise au navigateur. Retrouvez-la dans vos téléchargements.";
  }, "Préparation de votre affiche PNG…", { fileKind: "poster", operation: "download" });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-[4px] border-border bg-white text-graphite hover:bg-purple-haze"
            aria-label="Ouvrir les actions de la campagne"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[min(264px,calc(100vw-24px))] rounded-[8px] border-lavender-mist bg-white p-1.5 shadow-product-card"
        >
          <DropdownMenuItem
            className={itemClass}
            onSelect={() =>
              openCampaignPreview(campaignId, () => setIsPreviewOpen(true))
            }
          >
            <Eye className="h-4 w-4" />
            Prévisualiser
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} asChild>
            <a href={`/data?campaign=${campaignId}`}>
              <BarChart3 className="h-4 w-4" />
              Données
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={itemClass} onSelect={() => setIsQrOpen(true)}>
              <QrCode className="h-4 w-4" />
              QR Code
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} asChild>
            <a href={`/campaigns/${campaignId}/poster`}>
              <ImageIcon className="h-4 w-4" />
              Affiche
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} onSelect={downloadPoster}>
              <Download className="h-4 w-4" />
              Télécharger l&apos;affiche
          </DropdownMenuItem>
          <DropdownMenuItem className={itemClass} asChild>
            <a href={`/campaigns/${campaignId}/email`}>
              <Mail className="h-4 w-4" />
              Email de gain
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="space-y-1">
            <DuplicateCampaignButton campaignId={campaignId} variant="menu" />
            <DropdownMenuItem className={itemClass} onSelect={() => setIsDuplicateLocationsOpen(true)}>
              <CopyPlus className="h-4 w-4" aria-hidden="true" /> Dupliquer vers des sites
            </DropdownMenuItem>
            {allowAdminDuplicate ? <DropdownMenuItem className={itemClass} onSelect={() => setIsAdminDuplicateOpen(true)}>
              <CopyPlus className="h-4 w-4" aria-hidden="true" /> Dupliquer vers un marchand
            </DropdownMenuItem> : null}
            <DropdownMenuItem
              className={`${itemClass} text-[var(--okado-status-danger-text)] focus:bg-[var(--okado-status-danger-bg)] focus:text-[var(--okado-status-danger-text)]`}
              onSelect={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {isQrOpen ? <CampaignQrDownloadDialog campaignId={campaignId} isActive={isActive} onClose={() => setIsQrOpen(false)} /> : null}
      {posterTask.state ? (
        <DownloadFeedbackDialog state={posterTask.state} title="Affiche A4 / A5" onClose={posterTask.close} onRetry={downloadPoster} />
      ) : null}
      {isDeleteOpen ? (
        <DeleteCampaignDialog campaignId={campaignId} campaignTitle={campaignTitle} open onClose={() => setIsDeleteOpen(false)} />
      ) : null}
      {isPreviewOpen ? (
        <CampaignPreviewDialog campaignId={campaignId} open onClose={() => setIsPreviewOpen(false)} />
      ) : null}
      {isDuplicateLocationsOpen ? (
        <DuplicateCampaignToLocationsDialog campaignId={campaignId} open onClose={() => setIsDuplicateLocationsOpen(false)} />
      ) : null}
      {allowAdminDuplicate && isAdminDuplicateOpen ? <AdminDuplicateCampaignDialog campaignId={campaignId} onClose={() => setIsAdminDuplicateOpen(false)} /> : null}
    </>
  );
}
