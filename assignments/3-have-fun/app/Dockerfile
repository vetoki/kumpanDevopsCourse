FROM public.ecr.aws/lambda/nodejs:22 as builder

WORKDIR /app

COPY package*.json src/index.ts ./

RUN npm i
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/dist/ ${LAMBDA_TASK_ROOT}

CMD ["index.handler"]