# DX-TRACE | Multi-stage Node.js application image
#
# @Project DX-TRACE
# @Maintainer Nguyễn Ngọc Hiếu and DX-TRACE contributors
# @File selfhost/Dockerfile
# SPDX-License-Identifier: MIT
#
# MIT License
#
# Copyright (c) 2026 DX-TRACE contributors
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY . .
RUN pnpm install --frozen-lockfile && node selfhost/build.mjs
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/selfhost/generated selfhost/generated
COPY --from=build /app/selfhost/*.mjs selfhost/
COPY --from=build /app/lib lib
COPY --from=build /app/app/api app/api
COPY --from=build /app/package.json .
COPY --from=build /app/LICENSE .
COPY --from=build /app/drizzle drizzle
RUN mkdir -p node_modules data && chown node:node data
COPY --from=build /app/node_modules/.pnpm/zod@3.25.76/node_modules/zod node_modules/zod
ENV DATA_DIR=/app/data BIND_ADDRESS=0.0.0.0
USER node
CMD ["node","selfhost/server.mjs"]
