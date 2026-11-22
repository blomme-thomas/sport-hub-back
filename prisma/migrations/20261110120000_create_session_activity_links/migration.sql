-- CreateTable
CREATE TABLE "session_activity_links" (
    "session_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "linked_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_activity_links_pkey" PRIMARY KEY ("session_id"),
    CONSTRAINT "session_activity_links_origin_check" CHECK ("origin" IN ('automatique', 'manuel'))
);

-- CreateIndex
CREATE UNIQUE INDEX "session_activity_links_activity_id_key" ON "session_activity_links"("activity_id");

-- AddForeignKey
ALTER TABLE "session_activity_links" ADD CONSTRAINT "session_activity_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
